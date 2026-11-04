"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type User = { name: string }; // null = invitado
export type SavedScore = { game: string; score: number; name: string; at: number };

type UserContextValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial null: la sesión se lee tras la hidratación para evitar mismatch.
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let stored: User | null = null;
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_KEY) || "null");
      if (parsed && typeof parsed.name === "string") stored = { name: parsed.name };
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

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      const all: SavedScore[] = Array.isArray(raw) ? raw : [];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, logout, saveScore }), [user, login, logout, saveScore]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser debe usarse dentro de <UserProvider>");
  return ctx;
}
