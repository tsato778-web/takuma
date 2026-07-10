"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PageShell, MasterTable, Chip } from "@/components/admin/page-shell";
import { MENUS, STAFF, MENU_COLOR, staffHandlesMenu, nominationOf, NOMINATION_LABEL, type MenuColor, type NominationPolicy } from "@/lib/mock-data";
import { TICKET_PLANS, yen } from "@/lib/pos";

const COLORS = Object.keys(MENU_COLOR) as MenuColor[];
type Tab = "list" | "new";

export default function MenusPage() {
  const [tab, setTab] = React.useState<Tab>("list");
  return (
    <PageShell
      title="メニュー作成"
      description="店舗ごとに予約メニューを作成・編集・公開管理。対応スタッフもここで設定します。"
      action={
        <div className="flex overflow-hidden rounded-md border border-border">
          {([["list", "メニュー一覧"], ["new", "新規作成"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>{l}</button>
          ))}
        </div>
      }
    >
      {tab === "list" ? <MenuList /> : <MenuForm />}
    </PageShell>
  );
}

function MenuList() {
  return (
    <MasterTable
      columns={["並", "メニュー", "価格", "所要", "ｲﾝﾀｰﾊﾞﾙ", "カラー", "回数券", "対応スタッフ", "指名", "公開"]}
      rows={MENUS.map((m, i) => {
        const ticket = TICKET_PLANS.find((t) => t.menus === m.name);
        const staffs = STAFF.filter((s) => staffHandlesMenu(s.id, m.id));
        const pol = nominationOf(m);
        return [
          String(i + 1),
          <span key="n" className="font-medium">{m.name}</span>,
          yen(m.price),
          `${m.durationMin}分`,
          m.intervalMin > 0 ? `${m.intervalMin}分` : "—",
          <span key="c" className={`inline-block h-3.5 w-3.5 rounded-full ${MENU_COLOR[m.color].dot}`} />,
          ticket ? <Chip key="t" tone="accent">対象</Chip> : <Chip key="t" tone="muted">対象外</Chip>,
          <span key="s" className="text-[11px] text-muted-foreground">{staffs.map((s) => s.name.split(" ")[0]).join("・")}</span>,
          <Chip key="nm" tone={pol === "FORCED" || pol === "DEDICATED" ? "accent" : "muted"}>{NOMINATION_LABEL[pol]}</Chip>,
          <Chip key="p" tone="ok">公開</Chip>,
        ];
      })}
    />
  );
}

const NOMINATION_DESC: Record<NominationPolicy, string> = {
  OPTIONAL: "お客様が担当を選べる（おまかせも可）",
  NONE: "担当選択なし。店舗側で割り当て",
  FORCED: "選択時に特定スタッフが自動で担当",
  DEDICATED: "対応スタッフのみ予約可（他は不可）",
};

function MenuForm() {
  const [color, setColor] = React.useState<MenuColor>("blue");
  const [staffOn, setStaffOn] = React.useState<Set<string>>(new Set(STAFF.map((s) => s.id)));
  const [ticket, setTicket] = React.useState(false);
  const [nomination, setNomination] = React.useState<NominationPolicy>("OPTIONAL");
  const [forcedStaff, setForcedStaff] = React.useState<string>(STAFF[0].id);
  const toggleStaff = (id: string) => setStaffOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">基本情報</div>
          <div className="grid grid-cols-2 gap-3">
            <Text label="メニュー名" placeholder="美容整体90分" full />
            <Select label="カテゴリー" options={["ヘア", "スパ・トリートメント", "フェイシャル", "整体", "ネイル"]} />
            <Select label="価格区分" options={["新規", "再来", "会員", "非会員"]} />
            <Text label="価格" placeholder="¥9,900" />
            <Text label="所要時間" placeholder="90分" />
            <Text label="インターバル時間" placeholder="15分" />
            <Text label="受付可能数" placeholder="1" />
            <Text label="並び順" placeholder="1" />
            <Text label="消化単価（回数券）" placeholder="¥9,000" />
            <Text label="有効期限（月）" placeholder="6" />
          </div>
          <div className="mt-3">
            <span className="text-[10px] text-muted-foreground">説明文</span>
            <textarea rows={2} placeholder="メニューの説明" className="mt-0.5 w-full rounded-md border border-input bg-card px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">表示・カラー・画像</div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground">コースカラー</span>
              <div className="mt-1 flex gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={cn("h-6 w-6 rounded-full ring-2 ring-offset-1", MENU_COLOR[c].dot, color === c ? "ring-foreground/40" : "ring-transparent")} />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-primary" />予約ページに表示</label>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={ticket} onChange={(e) => setTicket(e.target.checked)} className="h-3.5 w-3.5 accent-accent" />回数券対象</label>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">＋画像</div>
          </div>
        </div>

        {/* 対応スタッフ */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">このメニューに対応できるスタッフ</div>
          <div className="flex flex-wrap gap-2">
            {STAFF.map((s) => {
              const on = staffOn.has(s.id);
              return (
                <button key={s.id} onClick={() => toggleStaff(s.id)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {on ? "☑" : "☐"} {s.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">チェックを外したスタッフは、予約作成・お客様予約画面でこのメニューを選べません（台帳でも不一致を警告）。</p>
        </div>

        {/* 指名設定 */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">指名設定（お客様予約画面に反映）</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(NOMINATION_DESC) as NominationPolicy[]).map((p) => (
              <button key={p} type="button" onClick={() => setNomination(p)} className={cn("rounded-lg border p-2 text-left transition-colors", nomination === p ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40")}>
                <div className="text-xs font-medium">{NOMINATION_LABEL[p]}</div>
                <div className="text-[10px] text-muted-foreground">{NOMINATION_DESC[p]}</div>
              </button>
            ))}
          </div>
          {nomination === "FORCED" && (
            <label className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">強制担当</span>
              <select value={forcedStaff} onChange={(e) => setForcedStaff(e.target.value)} className="h-8 rounded-md border border-input bg-card px-2 text-xs">
                {STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">「サロンの空き状況（おまかせ）／スタッフ別の空き状況（指名）」の出し分けに反映されます。</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold text-muted-foreground">プレビュー</div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", MENU_COLOR[color].dot)} />
              <span className="text-sm font-semibold">美容整体90分</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">90分 ・ ¥9,900 {ticket && "・ 回数券対象"}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">対応：{STAFF.filter((s) => staffOn.has(s.id)).map((s) => s.name.split(" ")[0]).join("・") || "なし"}</div>
          </div>
        </div>
        <button className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">メニューを保存</button>
        <p className="text-[11px] text-muted-foreground">※ モックUIです。保存後は予約台帳・お客様予約画面・出勤表に反映されます。</p>
      </div>
    </div>
  );
}

function Text({ label, placeholder, full }: { label: string; placeholder?: string; full?: boolean }) {
  return (
    <label className={cn("block", full && "col-span-2")}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input placeholder={placeholder} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" />
    </label>
  );
}
function Select({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <select className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
