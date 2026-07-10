"use client";

import * as React from "react";

import { BRANDS, type Brand } from "./mock-data";

// マルチブランド前提のブランド切替コンテキスト（管理者用）。
// 選択中ブランドコードを localStorage に保存し、リロードしても維持する。
// 各画面（ホーム/KPI/予約モード制御 等）はこの context から currentBrand を読み、
// ブランドごとに表示・挙動を切り替える。

interface BrandContextValue {
  brand: Brand;
  setBrandCode: (code: string) => void;
}

const BrandContext = React.createContext<BrandContextValue | null>(null);

const STORAGE_KEY = "repisuto.currentBrandCode";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = React.useState<string>(BRANDS[0]?.code ?? "");

  // 初期化時に localStorage から復元
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && BRANDS.some((b) => b.code === stored)) setCode(stored);
  }, []);

  const setBrandCode = React.useCallback((c: string) => {
    setCode(c);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const brand = BRANDS.find((b) => b.code === code) ?? BRANDS[0];

  return <BrandContext.Provider value={{ brand, setBrandCode }}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const ctx = React.useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
