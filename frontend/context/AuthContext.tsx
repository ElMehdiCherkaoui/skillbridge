"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  getToken,
  setSession,
  TOKEN_KEY,
  USER_KEY,
} from "@/lib/api";
import { login as loginApi, getMe, logout as logoutApi, acceptInvite } from "@/services/auth";
import { Role, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  accept: (token: string, fullName: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      setSession(getToken()!, me);
    } catch {
      clearSession();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginApi(email, password);
    setSession(res.token, res.user);
    setUser(res.user);
    setToken(res.token);
    return res.user;
  }, []);

  const accept = useCallback(async (token: string, fullName: string, password: string) => {
    const res = await acceptInvite(token, fullName, password);
    setSession(res.token, res.user);
    setUser(res.user);
    setToken(res.token);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Token may already be invalid; local session is cleared regardless.
    }
    clearSession();
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, token, loading, login, accept, logout, refresh }),
    [user, token, loading, login, accept, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { TOKEN_KEY };