import { api } from "@/lib/api";
import { AuthResponse, User } from "@/types";

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/api/auth/login", { email, password }, false);
}

export async function acceptInvite(
  token: string,
  fullName: string,
  password: string,
): Promise<AuthResponse> {
  return api.post<AuthResponse>(
    "/api/invites/accept",
    { token, fullName, password },
    false,
  );
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout", {}, true);
  } catch {
    // token is cleared client-side regardless
  }
}

export async function getMe(): Promise<User> {
  return api.get<User>("/api/auth/me");
}