"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type User = { name: string }; // null = invitado

type UserContextValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const USER_KEY = "av_user";

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial null: la sesión se lee tras la hidratación para evitar mismatch.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let stored: User | null = null;
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (parsed && typeof parsed.name === "string")
        stored = { name: parsed.name };
    } catch {
      // localStorage no disponible o JSON inválido: se sigue como invitado
    }
    if (!stored) return;
    // Diferido a una microtarea: evita setState síncrono dentro del efecto.
    queueMicrotask(() => setUser(stored));
  }, []);

  const login = useCallback((u: User) => {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser debe usarse dentro de <UserProvider>");
  return ctx;
}
