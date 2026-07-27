"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { login as loginRequest } from "../api/login";
import { logout as logoutRequest } from "../api/logout";
import { refreshSession } from "../api/refresh-session";
import { clearAccessToken, setAccessToken } from "../store/access-token-store";
import type { AuthUser, LoginInput } from "../types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;

  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await refreshSession();

      setAccessToken(response.accessToken);
      setUser(response.user);
      setStatus("authenticated");

      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");

      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    refreshSession()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setAccessToken(response.accessToken);
        setUser(response.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        clearAccessToken();
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<void> => {
    const response = await loginRequest(input);

    setAccessToken(response.accessToken);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      logout,
      refresh,
    }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
