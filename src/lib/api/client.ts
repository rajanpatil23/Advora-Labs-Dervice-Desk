/**
 * Typed API client with automatic mock fallback.
 *
 * - When VITE_API_BASE_URL is empty, all calls resolve via the mock layer (src/lib/api/mock.ts).
 * - When VITE_API_BASE_URL is set, calls hit the real backend. If a request fails
 *   (network error, 5xx), the client transparently falls back to the mock so the
 *   demo never breaks.
 *
 * The local AI agent should implement the endpoints documented in API_CONTRACT.md
 * and point VITE_API_BASE_URL at that backend. No frontend changes needed.
 */

import { mockHandlers } from "./mock";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiRequest {
  method: HttpMethod;
  path: string; // e.g. "/auth/login"
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean; // attach bearer token from localStorage
}

const TOKEN_KEY = "connecttly.auth.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

function buildUrl(path: string, query?: ApiRequest["query"]) {
  const url = new URL(API_BASE + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function callRealApi<T>(req: ApiRequest): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (req.auth) {
    const t = tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(buildUrl(req.path, req.query), {
    method: req.method,
    headers,
    body: req.body ? JSON.stringify(req.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiCall<T>(req: ApiRequest): Promise<T> {
  // Mock-only mode
  if (!API_BASE) {
    return mockHandlers<T>(req);
  }
  // Real mode with mock fallback on network errors only
  try {
    return await callRealApi<T>(req);
  } catch (err) {
    if (err instanceof ApiError) throw err; // surface real HTTP errors
    console.warn(`[api] real backend unreachable, falling back to mock for ${req.method} ${req.path}`, err);
    return mockHandlers<T>(req);
  }
}
