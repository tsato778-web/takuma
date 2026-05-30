// 次回予約率ダッシュボードの集計エンジン（再来率最大化が思想）。
// 集計軸: 全店舗 / 店舗別 / スタッフ別 / 媒体別 / メニュー別。
// 表示項目: 来店人数 / 次回予約取得人数 / 次回予約率 / 前月比較 / 目標値との差分。
// ※ モック: 来店人数=該当顧客数（期間=現状全データ）。本実装では会計・予約データを期間集計する。

import { CUSTOMERS, STAFF, STORES, MENUS, type Customer, type Menu, type Staff, type Store } from "./mock-data";
import { visitHistory } from "./customer-data";

export interface RepeatRow {
  key: string;
  label: string;
  visits: number; // 来店人数
  nextBooked: number; // 次回予約取得人数
  rate: number; // 0–1
  prevRate: number; // 前月比較（モック: 現rate −0.05〜+0.05 の決定論的揺らぎ）
  target: number; // 目標値（0–1）
  diff: number; // rate − target
}

const TARGET = 0.7; // 全社の標準目標（70%）

function row(key: string, label: string, base: Customer[], target = TARGET): RepeatRow {
  const visits = base.length;
  const nextBooked = base.filter((c) => !!c.nextVisitDate).length;
  const rate = visits === 0 ? 0 : nextBooked / visits;
  // 決定論的に前月比を生成（key のハッシュで±）
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const noise = ((h % 11) - 5) / 100; // -0.05〜+0.05
  const prevRate = Math.max(0, Math.min(1, rate - noise));
  return { key, label, visits, nextBooked, rate, prevRate, target, diff: rate - target };
}

export function repeatAll(): RepeatRow {
  return row("all", "全店舗", CUSTOMERS);
}

export function repeatByStore(): RepeatRow[] {
  return STORES.map((s: Store) => row(`store:${s.id}`, s.name, CUSTOMERS.filter((c) => c.storeId === s.id)));
}

export function repeatByStaff(): RepeatRow[] {
  return STAFF.filter((s) => s.active).map((s: Staff) =>
    row(`staff:${s.id}`, s.name, CUSTOMERS.filter((c) => c.lastStaffId === s.id))
  );
}

export function repeatByMedia(): RepeatRow[] {
  const medias = Array.from(new Set(CUSTOMERS.map((c) => c.firstSource))).sort();
  return medias.map((m) => row(`media:${m}`, m, CUSTOMERS.filter((c) => c.firstSource === m)));
}

// メニュー別: 各顧客の最新来店メニューに含まれているかで判定（顧客×メニューの「直近利用者」基準）。
export function repeatByMenu(): RepeatRow[] {
  return MENUS.map((m: Menu) => {
    const base = CUSTOMERS.filter((c) => {
      const last = visitHistory(c)[0];
      return last && last.menus.includes(m.name);
    });
    return row(`menu:${m.id}`, m.name, base);
  });
}

// ホーム画面KPI（全店舗の次回予約率）
export function repeatRateOverall(): number {
  return repeatAll().rate;
}

// 口コミ取得率（visitCount>=1 のうち Google/HPB 口コミ済タグ）
export function reviewRateOverall(): number {
  const base = CUSTOMERS.filter((c) => c.visitCount >= 1);
  if (base.length === 0) return 0;
  const reviewed = base.filter((c) => c.tags.includes("Google口コミ済") || c.tags.includes("HPB口コミ済")).length;
  return reviewed / base.length;
}

// 紹介発生数（紹介タグ持ち顧客数）
export function referralCountOverall(): number {
  return CUSTOMERS.filter((c) => c.tags.includes("紹介") || c.firstSource === "紹介").length;
}
