// Frontend-only SSO configuration store. Persists to localStorage.
// Backend agent: replace with real SAML/OIDC config; UI shape stays the same.

export type SsoProtocol = "saml" | "oidc";
export type SsoProvider = "okta" | "azure" | "google_workspace" | "onelogin" | "jumpcloud" | "custom";

export type AttributeMap = {
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  groups: string;
  externalId: string;
};

export type RoleMapping = {
  id: string;
  groupName: string;   // value from IdP `groups` claim
  appRole: "owner" | "admin" | "manager" | "agent" | "resolver" | "requester";
};

export type DomainVerification = {
  domain: string;
  status: "pending" | "verified" | "failed";
  txtRecord: string;
  verifiedAt?: string;
};

export type SsoConfig = {
  enabled: boolean;
  protocol: SsoProtocol;
  provider: SsoProvider;
  displayName: string;          // shown on the login button, e.g. "Acme Okta"
  metadataUrl: string;          // for SAML
  metadataXml: string;          // pasted XML alternative
  entityId: string;             // SP entity id (info)
  acsUrl: string;               // SP ACS URL (info)
  // OIDC
  oidcIssuer: string;
  oidcClientId: string;
  oidcClientSecret: string;
  // attribute mapping
  attributes: AttributeMap;
  // JIT
  jitEnabled: boolean;
  jitDefaultRole: RoleMapping["appRole"];
  enforceForDomains: boolean;   // require SSO for verified domains
  roleMappings: RoleMapping[];
  domains: DomainVerification[];
  updatedAt: string;
};

const KEY = "lov.sso.v1";

const SP_ENTITY_ID = "https://app.connecttly.com/sso/saml/metadata";
const SP_ACS_URL = "https://app.connecttly.com/sso/saml/acs";

function defaultConfig(): SsoConfig {
  return {
    enabled: false,
    protocol: "saml",
    provider: "okta",
    displayName: "Sign in with SSO",
    metadataUrl: "",
    metadataXml: "",
    entityId: SP_ENTITY_ID,
    acsUrl: SP_ACS_URL,
    oidcIssuer: "",
    oidcClientId: "",
    oidcClientSecret: "",
    attributes: {
      email: "email",
      fullName: "displayName",
      firstName: "givenName",
      lastName: "familyName",
      groups: "groups",
      externalId: "nameID",
    },
    jitEnabled: true,
    jitDefaultRole: "agent",
    enforceForDomains: false,
    roleMappings: [
      { id: crypto.randomUUID(), groupName: "support-admins", appRole: "admin" },
      { id: crypto.randomUUID(), groupName: "support-agents", appRole: "agent" },
    ],
    domains: [],
    updatedAt: new Date().toISOString(),
  };
}

function read(): SsoConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultConfig();
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}
function write(c: SsoConfig) {
  c.updatedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(c));
}

function txtToken(domain: string): string {
  const seed = (domain + "-connecttly").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `connecttly-verify=${seed.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ssoApi = {
  get: () => read(),
  save: (patch: Partial<SsoConfig>) => {
    const cur = read();
    const next = { ...cur, ...patch };
    write(next);
    return next;
  },
  setAttribute: (key: keyof AttributeMap, value: string) => {
    const cur = read();
    cur.attributes = { ...cur.attributes, [key]: value };
    write(cur);
  },
  addRoleMapping: () => {
    const cur = read();
    cur.roleMappings = [...cur.roleMappings, { id: crypto.randomUUID(), groupName: "", appRole: "agent" }];
    write(cur);
    return cur;
  },
  updateRoleMapping: (id: string, patch: Partial<RoleMapping>) => {
    const cur = read();
    cur.roleMappings = cur.roleMappings.map(r => r.id === id ? { ...r, ...patch } : r);
    write(cur);
  },
  removeRoleMapping: (id: string) => {
    const cur = read();
    cur.roleMappings = cur.roleMappings.filter(r => r.id !== id);
    write(cur);
  },
  addDomain: (domain: string) => {
    const cur = read();
    const clean = domain.trim().toLowerCase();
    if (!clean || cur.domains.some(d => d.domain === clean)) return cur;
    cur.domains = [...cur.domains, { domain: clean, status: "pending", txtRecord: txtToken(clean) }];
    write(cur);
    return cur;
  },
  verifyDomain: (domain: string) => {
    const cur = read();
    cur.domains = cur.domains.map(d => d.domain === domain
      ? { ...d, status: Math.random() > 0.2 ? "verified" : "failed", verifiedAt: new Date().toISOString() }
      : d);
    write(cur);
    return cur;
  },
  removeDomain: (domain: string) => {
    const cur = read();
    cur.domains = cur.domains.filter(d => d.domain !== domain);
    write(cur);
  },
  testConnection: async (): Promise<{ ok: boolean; latencyMs: number; message: string }> => {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
    const cur = read();
    const hasMetadata = cur.protocol === "saml"
      ? !!(cur.metadataUrl || cur.metadataXml)
      : !!(cur.oidcIssuer && cur.oidcClientId && cur.oidcClientSecret);
    if (!hasMetadata) return { ok: false, latencyMs: 320, message: "Provider configuration is incomplete." };
    const ok = Math.random() > 0.15;
    return ok
      ? { ok: true, latencyMs: Math.round(180 + Math.random() * 320), message: "Round-trip handshake succeeded. Sample assertion validated." }
      : { ok: false, latencyMs: Math.round(180 + Math.random() * 600), message: "Signature could not be validated. Re-upload IdP metadata." };
  },
};

export const SP_DETAILS = { entityId: SP_ENTITY_ID, acsUrl: SP_ACS_URL };

export const PROVIDER_PRESETS: Record<SsoProvider, { label: string; protocol: SsoProtocol; helpUrl: string; tip: string }> = {
  okta:             { label: "Okta",             protocol: "saml", helpUrl: "https://help.okta.com",          tip: "Add a SAML 2.0 app and paste its metadata URL." },
  azure:            { label: "Azure / Entra ID", protocol: "saml", helpUrl: "https://entra.microsoft.com",    tip: "Create an Enterprise Application with SAML SSO." },
  google_workspace: { label: "Google Workspace", protocol: "saml", helpUrl: "https://admin.google.com",       tip: "Add a Custom SAML app under Web & mobile apps." },
  onelogin:         { label: "OneLogin",         protocol: "saml", helpUrl: "https://onelogin.com",           tip: "Use the SAML Custom Connector (advanced)." },
  jumpcloud:        { label: "JumpCloud",        protocol: "saml", helpUrl: "https://jumpcloud.com",          tip: "Create a Custom SAML application in the SSO console." },
  custom:           { label: "Custom IdP",       protocol: "saml", helpUrl: "",                               tip: "Use any SAML 2.0 / OIDC compliant identity provider." },
};
