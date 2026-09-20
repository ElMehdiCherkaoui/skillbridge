import { ApiError } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const TOKEN_KEY = "skillbridge_token";
export const USER_KEY = "skillbridge_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: unknown) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiRequestError extends Error {
  status: number;
  apiError: ApiError | null;

  constructor(status: number, apiError: ApiError | null, message: string) {
    super(message);
    this.status = status;
    this.apiError = apiError;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth: boolean = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let apiError: ApiError | null = null;
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.error) {
        apiError = body;
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiRequestError(res.status, apiError, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get<T>(path: string, auth = true) {
    return request<T>(path, { method: "GET" }, auth);
  },
  post<T>(path: string, body: unknown, auth = true) {
    return request<T>(path, { method: "POST", body: JSON.stringify(body) }, auth);
  },
  put<T>(path: string, body: unknown, auth = true) {
    return request<T>(path, { method: "PUT", body: JSON.stringify(body) }, auth);
  },
  delete<T>(path: string, auth = true) {
    return request<T>(path, { method: "DELETE" }, auth);
  },
};