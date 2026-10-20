import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./lib/api";
import type { User } from "./lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const signOut = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!tokenStore.get()) return;
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => signOut())
      .finally(() => setLoading(false));
  }, [signOut]);

  const signIn = async (email: string, password: string) => {
    const r = await api.login({ email, password });
    tokenStore.set(r.token);
    setUser(r.user);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const r = await api.register({ name, email, password });
    tokenStore.set(r.token);
    setUser(r.user);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
