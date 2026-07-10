"use client";

import * as React from "react";
import { Send, Save, Users, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOMERS,
  MEDIA_OPTIONS,
  STAFF,
  formatCustomerNo,
  ticketRemainingTotal,
  isChurnRisk,
  isNewCustomer,
  type Customer,
} from "@/lib/mock-data";
import { ageFromBirthday, ageBand } from "@/lib/customer-data";
import { PageShell } from "@/components/admin/page-shell";

const ALL_TAGS = Array.from(new Set(CUSTOMERS.flatMap((c) => [...c.tags, ...c.messageTags])));
const AGES = ["20代", "30代", "40代", "50代以上"];

interface Cond {
  media: string;
  tag: string;
  gender: string;
  age: string;
  staff: string;
  ticket: string; // ""/yes/no/one
  next: string; // ""/yes/no
  review: string; // ""/google/hpb/none
  segment: string; // ""/new/repeat
  risk: boolean;
  ltvMin: string;
}
const EMPTY: Cond = { media: "", tag: "", gender: "", age: "", staff: "", ticket: "", next: "", review: "", segment: "", risk: false, ltvMin: "" };

function match(c: Customer, q: Cond): boolean {
  if (q.media && c.firstSource !== q.media) return false;
  if (q.tag && !c.tags.includes(q.tag) && !c.messageTags.includes(q.tag)) return false;
  if (q.gender && c.gender !== (q.gender === "女性" ? "F" : "M")) return false;
  if (q.age && ageBand(ageFromBirthday(c.birthday)) !== q.age) return false;
  if (q.staff && c.mainStaffId !== q.staff) return false;
  const t = ticketRemainingTotal(c);
  if (q.ticket === "yes" && t === 0) return false;
  if (q.ticket === "no" && t > 0) return false;
  if (q.ticket === "one" && t !== 1) return false;
  if (q.next === "yes" && !c.nextVisitDate) return false;
  if (q.next === "no" && c.nextVisitDate) return false;
  if (q.review === "google" && !c.tags.includes("Google口コミ済")) return false;
  if (q.review === "hpb" && !c.tags.includes("HPB口コミ済")) return false;
  if (q.review === "none" && (c.tags.includes("Google口コミ済") || c.tags.includes("HPB口コミ済"))) return false;
  if (q.segment === "new" && !isNewCustomer(c)) return false;
  if (q.segment === "repeat" && isNewCustomer(c)) return false;
  if (q.risk && !isChurnRisk(c)) return false;
  if (q.ltvMin && c.ltv < Number(q.ltvMin)) return false;
  return true;
}

const PRESETS: { label: string; cond: Partial<Cond> }[] = [
  { label: "Meta広告 × 女性 × 30代 × 回数券なし × 次回予約なし", cond: { media: "Meta広告", gender: "女性", age: "30代", ticket: "no", next: "no" } },
  { label: "離反リスク（回数券0×次回予約なし）", cond: { risk: true } },
  { label: "VIP × 次回予約なし", cond: { tag: "VIP", next: "no" } },
  { label: "回数券 残1", cond: { ticket: "one" } },
];

export default function SegmentsPage() {
  const [q, setQ] = React.useState<Cond>(EMPTY);
  const set = (patch: Partial<Cond>) => setQ((p) => ({ ...p, ...patch }));
  const matched = CUSTOMERS.filter((c) => match(c, q));

  return (
    <PageShell title="セグメント配信" description="条件を組み合わせて配信対象を作成します（LINE一斉配信）。">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setQ({ ...EMPTY, ...p.cond })} className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary">
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">配信条件（すべて満たす）</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Sel label="媒体" value={q.media} onChange={(v) => set({ media: v })} options={MEDIA_OPTIONS} />
              <Sel label="タグ" value={q.tag} onChange={(v) => set({ tag: v })} options={ALL_TAGS} />
              <Sel label="性別" value={q.gender} onChange={(v) => set({ gender: v })} options={["女性", "男性"]} />
              <Sel label="年代" value={q.age} onChange={(v) => set({ age: v })} options={AGES} />
              <Sel label="担当者" value={q.staff} onChange={(v) => set({ staff: v })} options={STAFF.map((s) => ({ value: s.id, label: s.name }))} />
              <Sel label="回数券" value={q.ticket} onChange={(v) => set({ ticket: v })} options={[{ value: "yes", label: "あり" }, { value: "no", label: "なし" }, { value: "one", label: "残1" }]} />
              <Sel label="次回予約" value={q.next} onChange={(v) => set({ next: v })} options={[{ value: "yes", label: "あり" }, { value: "no", label: "なし" }]} />
              <Sel label="口コミ" value={q.review} onChange={(v) => set({ review: v })} options={[{ value: "google", label: "Google済" }, { value: "hpb", label: "HPB済" }, { value: "none", label: "未取得" }]} />
              <Sel label="区分" value={q.segment} onChange={(v) => set({ segment: v })} options={[{ value: "new", label: "新規" }, { value: "repeat", label: "再来" }]} />
              <label className="block">
                <span className="text-[10px] text-muted-foreground">LTV下限</span>
                <input type="number" value={q.ltvMin} onChange={(e) => set({ ltvMin: e.target.value })} placeholder="¥" className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-xs" />
              </label>
              <label className="flex items-end gap-1.5 pb-1 text-xs">
                <input type="checkbox" checked={q.risk} onChange={(e) => set({ risk: e.target.checked })} className="h-3.5 w-3.5 accent-rose-500" />
                <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />離反リスク</span>
              </label>
            </div>
            <button onClick={() => setQ(EMPTY)} className="mt-3 text-[11px] text-muted-foreground underline-offset-2 hover:underline">条件をクリア</button>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">配信対象プレビュー</div>
            <div className="max-h-72 overflow-y-auto thin-scrollbar">
              {matched.map((c) => (
                <div key={c.id} className="flex items-center gap-2 border-b border-border/50 px-4 py-2 text-sm last:border-0">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">No.{formatCustomerNo(c.customerNo)} ・ {c.firstSource}</span>
                  <div className="ml-auto flex gap-1">
                    {ticketRemainingTotal(c) === 0 && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">回数券なし</span>}
                    {!c.nextVisitDate && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">次回なし</span>}
                  </div>
                </div>
              ))}
              {matched.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">該当する顧客がいません</div>}
            </div>
          </div>
        </div>

        {/* 配信サマリー */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><Users className="h-3.5 w-3.5" />配信対象</div>
            <div className="mt-1 text-4xl font-bold tabular-nums text-primary">{matched.length}</div>
            <div className="text-xs text-muted-foreground">名 / 全{CUSTOMERS.length}名</div>
          </div>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white">
            <Send className="h-4 w-4" /> このセグメントに配信
          </button>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">
            <Save className="h-4 w-4" /> セグメントを保存
          </button>
          <p className="text-[11px] text-muted-foreground">※ モックUIです。実際の配信は LINE Messaging API 連携時に有効化します。</p>
        </div>
      </div>
    </PageShell>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }) {
  return (
    <label className="block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("mt-0.5 h-8 w-full rounded-md border bg-card px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", value ? "border-primary text-primary" : "border-input")}>
        <option value="">指定なし</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}
