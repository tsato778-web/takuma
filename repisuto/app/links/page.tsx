"use client";

import * as React from "react";
import { Copy, Check, Plus, Search, Copy as Dup, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { STORES } from "@/lib/mock-data";
import { PageShell, Chip } from "@/components/admin/page-shell";
import {
  LINKS,
  LINK_MEDIA,
  LINK_CAMPAIGNS,
  LINK_APPEALS,
  LINK_MENUS,
  LINK_TEMPLATES,
  buildUrl,
  type ForceLink,
} from "@/lib/links";

const yen = (n: number) => `¥${n.toLocaleString()}`;
const storeName = (id: string) => STORES.find((s) => s.id === `store_${id}`)?.name ?? id;

type Tab = "list" | "new" | "bulk";

export default function LinksPage() {
  const [tab, setTab] = React.useState<Tab>("list");
  return (
    <PageShell
      title="強制リンク作成"
      description="媒体・キャンペーン・訴求ごとに予約URLを発行。経由予約は顧客・予約・会計・LTVに媒体タグを引き継ぎます。"
      action={
        <div className="flex overflow-hidden rounded-md border border-border">
          {([["list", "リンク一覧"], ["new", "新規作成"], ["bulk", "一括作成"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>{l}</button>
          ))}
        </div>
      }
    >
      {tab === "list" && <LinkList />}
      {tab === "new" && <NewLink />}
      {tab === "bulk" && <BulkCreate />}
    </PageShell>
  );
}

function LinkList() {
  const [media, setMedia] = React.useState("");
  const [campaign, setCampaign] = React.useState("");
  const [store, setStore] = React.useState("");
  const [q, setQ] = React.useState("");
  const [copied, setCopied] = React.useState<string | null>(null);

  const list = LINKS.filter((l) => (!media || l.media === media) && (!campaign || l.campaign === campaign) && (!store || l.storeId === store) && (!q || l.title.includes(q)));

  const copy = (url: string, id: string) => { navigator.clipboard?.writeText(url); setCopied(id); setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="タイトル検索" className="h-8 w-56 rounded-md border border-input bg-card pl-8 pr-3 text-xs" />
        </div>
        <Sel value={media} onChange={setMedia} placeholder="媒体（すべて）" options={LINK_MEDIA} />
        <Sel value={campaign} onChange={setCampaign} placeholder="キャンペーン（すべて）" options={LINK_CAMPAIGNS} />
        <Sel value={store} onChange={setStore} placeholder="店舗（すべて）" options={STORES.map((s) => ({ value: s.id.replace("store_", ""), label: s.name }))} />
        <span className="ml-auto text-xs text-muted-foreground">{list.length}件</span>
      </div>

      <div className="overflow-x-auto thin-scrollbar rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              {["ID", "タイトル", "媒体", "店舗", "状態", "流入", "予約", "来店", "LTV", "URL", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">{l.id}</td>
                <td className="px-3 py-2.5"><div className="font-medium">{l.title}</div><div className="text-[10px] text-muted-foreground">{l.campaign} ・ {l.appeal} ・ {l.menu}</div></td>
                <td className="px-3 py-2.5"><Chip tone="accent">{l.media}</Chip></td>
                <td className="px-3 py-2.5 text-xs">{storeName(l.storeId)}</td>
                <td className="px-3 py-2.5">{l.status === "稼働中" ? <Chip tone="ok">稼働中</Chip> : l.status === "停止" ? <Chip tone="warn">停止</Chip> : <Chip tone="muted">下書き</Chip>}</td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">{l.visits.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">{l.reservations}</td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">{l.visited}</td>
                <td className="px-3 py-2.5 text-right text-xs font-medium tabular-nums">{yen(l.ltv)}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => copy(l.url, l.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary">
                    {copied === l.id ? <><Check className="h-3 w-3 text-emerald-600" />済</> : <><Copy className="h-3 w-3" />コピー</>}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                  <span className="cursor-default hover:text-foreground">編集</span>
                  <span className="mx-1">·</span>
                  <span className="inline-flex cursor-default items-center gap-0.5 hover:text-foreground"><Dup className="h-3 w-3" />複製</span>
                  <span className="mx-1">·</span>
                  <span className="inline-flex cursor-default items-center gap-0.5 hover:text-rose-600"><Trash2 className="h-3 w-3" /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewLink() {
  const [v, setV] = React.useState({ store: "shibuya", media: "Meta広告", campaign: "肩こり訴求", adset: "女性30代", ad: "ad_01", appeal: "初回1,980円", menu: "整体60分", tag: "肩こり", template: "Aテンプレート" });
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  const url = buildUrl({ storeId: v.store, media: v.media, campaign: v.campaign, appeal: v.appeal, menu: v.menu, tag: v.tag });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
        <Field label="店舗" value={v.store} onChange={(x) => set("store", x)} options={STORES.map((s) => ({ value: s.id.replace("store_", ""), label: s.name }))} />
        <Field label="媒体" value={v.media} onChange={(x) => set("media", x)} options={LINK_MEDIA} />
        <Field label="キャンペーン" value={v.campaign} onChange={(x) => set("campaign", x)} options={LINK_CAMPAIGNS} />
        <TextField label="広告セット" value={v.adset} onChange={(x) => set("adset", x)} />
        <TextField label="広告名" value={v.ad} onChange={(x) => set("ad", x)} />
        <Field label="訴求" value={v.appeal} onChange={(x) => set("appeal", x)} options={LINK_APPEALS} />
        <Field label="メニュー" value={v.menu} onChange={(x) => set("menu", x)} options={LINK_MENUS} />
        <TextField label="タグ" value={v.tag} onChange={(x) => set("tag", x)} />
        <Field label="テンプレート" value={v.template} onChange={(x) => set("template", x)} options={LINK_TEMPLATES} />
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">生成されるURL</div>
          <code className="block break-all rounded-md bg-secondary/50 p-2 text-[11px] text-muted-foreground">{url}</code>
          <div className="mt-2 text-[11px] text-muted-foreground">付与タグ：<Chip tone="accent">媒体:{v.media}</Chip> <Chip>{v.tag}</Chip></div>
        </div>
        <button className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground">このリンクを発行</button>
        <p className="text-[11px] text-muted-foreground">※ モックUIです。発行後、経由予約に媒体タグ・キャンペーン情報が引き継がれます。</p>
      </div>
    </div>
  );
}

function BulkCreate() {
  const [media, setMedia] = React.useState<string[]>(["Meta広告"]);
  const [campaign, setCampaign] = React.useState<string[]>(["肩こり訴求", "腰痛訴求"]);
  const [appeal, setAppeal] = React.useState<string[]>(["初回1,980円", "初回2,980円"]);
  const [template, setTemplate] = React.useState<string[]>(["Aテンプレート"]);
  const [store, setStore] = React.useState<string[]>(["shibuya"]);

  const combos: { store: string; media: string; campaign: string; appeal: string; template: string }[] = [];
  for (const s of store) for (const m of media) for (const c of campaign) for (const a of appeal) for (const t of template) combos.push({ store: s, media: m, campaign: c, appeal: a, template: t });

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <MultiRow label="店舗" options={STORES.map((s) => s.id.replace("store_", ""))} optionLabel={(o) => STORES.find((s) => s.id === `store_${o}`)?.name ?? o} selected={store} onToggle={(v) => toggle(store, setStore, v)} />
        <MultiRow label="媒体" options={LINK_MEDIA} selected={media} onToggle={(v) => toggle(media, setMedia, v)} />
        <MultiRow label="キャンペーン（訴求軸）" options={LINK_CAMPAIGNS} selected={campaign} onToggle={(v) => toggle(campaign, setCampaign, v)} />
        <MultiRow label="訴求（価格）" options={LINK_APPEALS} selected={appeal} onToggle={(v) => toggle(appeal, setAppeal, v)} />
        <MultiRow label="テンプレート" options={LINK_TEMPLATES} selected={template} onToggle={(v) => toggle(template, setTemplate, v)} />
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-[11px] text-muted-foreground">一括生成されるURL数</div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-primary">{combos.length}</div>
          <div className="text-xs text-muted-foreground">本</div>
        </div>
        <div className="max-h-72 overflow-y-auto thin-scrollbar rounded-xl border border-border bg-card">
          {combos.slice(0, 40).map((c, i) => (
            <div key={i} className="border-b border-border/50 px-3 py-1.5 text-[11px] last:border-0">
              <div className="font-medium">{c.media} × {c.campaign} × {c.appeal}</div>
              <code className="break-all text-muted-foreground">{buildUrl({ storeId: c.store, media: c.media, campaign: c.campaign, appeal: c.appeal, menu: "整体60分", tag: c.campaign })}</code>
            </div>
          ))}
          {combos.length > 40 && <div className="px-3 py-2 text-center text-[11px] text-muted-foreground">ほか {combos.length - 40} 本…</div>}
        </div>
        <button disabled={combos.length === 0} className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{combos.length}本を一括発行</button>
      </div>
    </div>
  );
}

// ---- 部品 ----
function Sel({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-8 rounded-md border bg-card px-2 text-xs", value ? "border-primary text-primary" : "border-input")}>
      <option value="">{placeholder}</option>
      {options.map((o) => { const v = typeof o === "string" ? o : o.value; const l = typeof o === "string" ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
}
function Field({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[] }) {
  return (
    <label className="block"><span className="text-[10px] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-xs">
        {options.map((o) => { const v = typeof o === "string" ? o : o.value; const l = typeof o === "string" ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
      </select>
    </label>
  );
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block"><span className="text-[10px] text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-xs" />
    </label>
  );
}
function MultiRow({ label, options, optionLabel, selected, onToggle }: { label: string; options: string[]; optionLabel?: (o: string) => string; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} onClick={() => onToggle(o)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", selected.includes(o) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
            {optionLabel ? optionLabel(o) : o}
          </button>
        ))}
      </div>
    </div>
  );
}
