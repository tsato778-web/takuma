"use client";

import * as React from "react";

import { type Role } from "./permissions";

// 現在ログイン中ユーザーのロール（モック）。
// デモ用にサイドバーからロールを切り替えて「各役職に何が見えるか」を確認できる。
// localStorage に保存し、リロードしても保持。

interface UserContextValue {
  role: Role;
  name: string;
  setRole: (r: Role) => void;
}
const UserContext = React.createContext<UserContextValue | null>(null);

const STORAGE_KEY = "repisuto.currentRole";
const DEFAULT_NAME = "佐々木";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = React.useState<Role>("STORE_ADMIN");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (stored) setRole(stored);
  }, []);

  const setRolePersist = React.useCallback((r: Role) => {
    setRole(r);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, r);
  }, []);

  return <UserContext.Provider value={{ role, name: DEFAULT_NAME, setRole: setRolePersist }}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): UserContextValue {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used within UserProvider");
  return ctx;
}
