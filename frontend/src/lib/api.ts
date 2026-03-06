import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

interface ApiErrorResponse {
  detail: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

/**
 * Python FastAPI backend ile iletişim kuran fetch wrapper.
 * Her istekte Supabase Auth'tan alınan JWT token'ı otomatik olarak eklenir.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function api<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = `API error: ${response.status}`;
    try {
      const body: ApiErrorResponse = await response.json();
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // Response body parse edilemezse genel hata mesajı kullanılır
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** GET shorthand */
export function apiGet<T>(endpoint: string): Promise<T> {
  return api<T>(endpoint, { method: "GET" });
}

/** POST shorthand */
export function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  return api<T>(endpoint, { method: "POST", body: JSON.stringify(body) });
}

/** PATCH shorthand */
export function apiPatch<T>(endpoint: string, body: unknown): Promise<T> {
  return api<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) });
}

/** DELETE shorthand */
export function apiDelete<T = void>(endpoint: string): Promise<T> {
  return api<T>(endpoint, { method: "DELETE" });
}
