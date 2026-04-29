// Frontend-only security/SSO mock state. Persisted to localStorage so a
// local backend agent can later swap these calls for real API endpoints.

export type SsoProvider = "saml" | "oidc" | "google" | "microsoft";
export type SsoConfig = {
  enabled: boolean;
  provider: SsoProvider;
  metadataUrl?: string;
  entityId?: string;
  ssoUrl?: string;
  clientId?: string;
  clientSecret?: string;
  domain?: string; // enforced email domain
  enforceForAll: boolean;
};

export type SessionPolicy = {
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  requireMfa: boolean;
  passwordMinLength: number;
  passwordRequireSymbol: boolean;
};

export type IpRule = {
  id: string;
  cidr: string;
  label: string;
  mode: "allow" | "block";
  createdAt: string;
};

export type ApiToken = {
  id: string;
  name: string;
  prefix: string; // shown after creation
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
};

const KEY = "lov.security.v1";

type State = {
  sso: SsoConfig;
  policy: SessionPolicy;
  ipRules: IpRule[];
  tokens: ApiToken[];
};

const defaultState: State = {
  sso: {
    enabled: false,
    provider: "saml",
    enforceForAll: false,
  },
  policy: {
    sessionTimeoutMinutes: 720,
    idleTimeoutMinutes: 30,
    requireMfa: false,
    passwordMinLength: 10,
    passwordRequireSymbol: true,
  },
  ipRules: [],
  tokens: [],
};

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function write(s: State) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const securityApi = {
  get: () => read(),
  saveSso: (sso: SsoConfig) => {
    const s = read();
    s.sso = sso;
    write(s);
    return s.sso;
  },
  savePolicy: (policy: SessionPolicy) => {
    const s = read();
    s.policy = policy;
    write(s);
    return s.policy;
  },
  addIpRule: (input: Omit<IpRule, "id" | "createdAt">) => {
    const s = read();
    const rule: IpRule = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    s.ipRules = [rule, ...s.ipRules];
    write(s);
    return rule;
  },
  removeIpRule: (id: string) => {
    const s = read();
    s.ipRules = s.ipRules.filter(r => r.id !== id);
    write(s);
  },
  createToken: (name: string, scopes: string[], expiresAt?: string) => {
    const s = read();
    const secret = `lvbl_${crypto.randomUUID().replace(/-/g, "")}`;
    const token: ApiToken = {
      id: crypto.randomUUID(),
      name,
      prefix: secret.slice(0, 12),
      scopes,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    s.tokens = [token, ...s.tokens];
    write(s);
    return { token, secret };
  },
  revokeToken: (id: string) => {
    const s = read();
    s.tokens = s.tokens.filter(t => t.id !== id);
    write(s);
  },
};

export const ALL_SCOPES = [
  "tickets:read",
  "tickets:write",
  "users:read",
  "users:write",
  "reports:read",
  "webhooks:write",
];
