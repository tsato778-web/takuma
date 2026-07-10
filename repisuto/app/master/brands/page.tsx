"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Building2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, Chip, MockBadge } from "@/components/admin/page-shell";
import { useBrand } from "@/lib/brand-context";
import { KPI_CATALOG, formatKpiValue, kpiByKey } from "@/lib/brand-kpi";
import { BRANDS, COMPANIES, type BrandKpi, type IndustryPreset } from "@/lib/mock-data";

type Tab = "basic" | "booking" | "kpi";
const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "基本情報" },
  { id: "booking", label: "予約モード" },
  { id: "kpi", label: "KPI 設定" },
];

const INDUSTRY_OPTIONS: { value: IndustryPreset; label: string }[] = [
  { value: "beauty", label: "美容（雛形）" },
  { value: "chiropractic", label: "整体（雛形）" },
  { value: "esthetic", label: "エステ（雛形）" },
  { value: "pilates", label: "ピラティス（雛形）" },
  { value: "membership", label: "会員制（雛形）" },
  { value: "custom", label: "カスタム" },
];

export default function BrandsMasterPage() {
  const { brand, setBrandCode } = useBrand();
  const [tab, setTab] = React.useState<Tab>("basic");
  // 編集はモック：ローカル state でブランド設定を持つ（リロードで初期化）
  const [kpis, setKpis] = React.useState<BrandKpi[]>(brand.kpis);
  const [config, setConfig] = React.useState(brand.bookingConfig);
  const [name, setName] = React.useState(brand.name);
  const [industry, setIndustry] = React.useState<IndustryPreset>(brand.industryPreset ?? "custom");

  // ブランド切替時に編集中の state をそのブランドの値で再初期化
  React.useEffect(() => {
    setKpis(brand.kpis);
    setConfig(brand.bookingConfig);
    setName(brand.name);
    setIndustry(brand.industryPreset ?? "custom");
  }, [brand]);

  return (
    <PageShell
      title="ブランドマスター"
      description="業種ではなくブランド単位で予約モード／KPI／通知を最適化します。サイドバーで運用中ブランドを切り替えると、ここの編集対象も切り替わります。"
      action={<MockBadge />}
    >
      {/* ブランド一覧（横並びチップ） */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.code}
            type="button"
            onClick={() => setBrandCode(b.code)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              brand.code === b.code ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            {b.code}・{b.name}
          </button>
        ))}
        <span className="inline-flex cursor-default items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground"><Plus className="h-3 w-3" />ブランドを追加（モック）</span>
      </div>

      {/* タブ */}
      <div className="mb-3 flex overflow-hidden rounded-md border border-border w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">基本情報</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ブランドコード"><input value={brand.code} readOnly className="mt-0.5 h-8 w-full rounded-md border border-input bg-secondary px-2 text-sm font-mono" /></Field>
              <Field label="所属企業"><input value={`${brand.companyCode}・${COMPANIES.find(c=>c.code===brand.companyCode)?.name ?? ""}`} readOnly className="mt-0.5 h-8 w-full rounded-md border border-input bg-secondary px-2 text-sm" /></Field>
              <Field label="ブランド名" full><input value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-sm" /></Field>
              <Field label="業種テンプレ（初期値の雛形）" full>
                <select value={industry} onChange={(e) => setIndustry(e.target.value as IndustryPreset)} className="mt-0.5 h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
                  {INDUSTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">※ 業種は雛形（初期値のみ）。予約モード/KPIはこの後のタブで自由に編集できます。</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs">
            <div className="mb-1 font-semibold text-muted-foreground">ID 体系</div>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>企業：<b>C0001</b>（中央採番・欠番なし）</li>
              <li>ブランド：<b>B0001</b>（中央採番・欠番なし・永続）</li>
              <li>店舗：<b>T0001</b>（中央採番・欠番なし・永続）</li>
              <li>スタッフ：<b>S00001</b>（退職後も保持）</li>
              <li>顧客：<b>U000001</b>（退会後も保持）</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "booking" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">予約モード（ブランドごとに動的に切替）</div>
          <p className="mb-3 text-[11px] text-muted-foreground">業種に依存させず、ブランドごとに「店舗あり/なし」「担当あり/なし」「複数担当」などを選択します。お客様予約画面・予約台帳の表示はこの設定に追従します。</p>
          <div className="space-y-2">
            <Toggle label="店舗選択を必須にする（店舗あり）" desc="OFF にすると、店舗選択なしで予約可能（チェーン共通枠／オンライン業態など）。" value={config.requiresStore} onChange={(v) => setConfig({ ...config, requiresStore: v })} />
            <Toggle label="担当選択を必須にする（担当あり）" desc="OFF にすると、担当選択をスキップ。指名概念のない業態（集合レッスン等）で使用。" value={config.requiresStaff} onChange={(v) => setConfig({ ...config, requiresStaff: v })} />
            <Toggle label="メニュー別の複数担当割当を許可" desc="美容室・整体院など、メニューごとに担当を分けて売上配分する業態。" value={config.allowMultiAssign} onChange={(v) => setConfig({ ...config, allowMultiAssign: v })} />
            <Toggle label="メニュー選択を必須にする" desc="OFF にすると、メニュー選択なしでも予約可能（カウンセリング枠など）。" value={config.menuRequired} onChange={(v) => setConfig({ ...config, menuRequired: v })} />
            <label className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs">
              <div>
                <div className="font-medium">スロット粒度</div>
                <div className="text-[10px] text-muted-foreground">お客様予約画面 ◯△× グリッドの行の粒度。</div>
              </div>
              <select value={config.slotGranularity} onChange={(e) => setConfig({ ...config, slotGranularity: Number(e.target.value) as 15 | 30 | 60 })} className="h-7 rounded-md border border-input bg-card px-2 text-xs">
                <option value={15}>15分</option>
                <option value={30}>30分</option>
                <option value={60}>60分</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {tab === "kpi" && <KpiEditor kpis={kpis} setKpis={setKpis} />}
    </PageShell>
  );
}

function KpiEditor({ kpis, setKpis }: { kpis: BrandKpi[]; setKpis: React.Dispatch<React.SetStateAction<BrandKpi[]>> }) {
  const sorted = [...kpis].sort((a, b) => a.order - b.order);
  const enabledKeys = new Set(sorted.map((k) => k.key));
  const catalogAvailable = KPI_CATALOG.filter((k) => !enabledKeys.has(k.key));

  function move(idx: number, dir: -1 | 1) {
    const next = [...sorted];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setKpis(next.map((k, i) => ({ ...k, order: i + 1 })));
  }
  function remove(key: string) {
    setKpis((ks) => ks.filter((k) => k.key !== key));
  }
  function add(key: string) {
    const def = kpiByKey(key);
    if (!def) return;
    const order = sorted.length + 1;
    const target = def.kind === "rate" ? 0.6 : def.kind === "yen" ? 50000 : 5;
    const warn = def.kind === "rate" ? 0.4 : def.kind === "yen" ? 30000 : 8;
    setKpis((ks) => [...ks, { key, target, warn, order, enabled: true }]);
  }
  function update(key: string, patch: Partial<BrandKpi>) {
    setKpis((ks) => ks.map((k) => (k.key === key ? { ...k, ...patch } : k)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">表示KPI（順序・目標・警告）</div>
          <span className="text-[10px] text-muted-foreground">ホーム画面 / にこの順で表示されます</span>
        </div>
        <div className="overflow-x-auto thin-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                {["順", "KPI", "目標", "警告", "有効", ""].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.map((k, i) => {
                const def = kpiByKey(k.key);
                if (!def) return null;
                return (
                  <tr key={k.key} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}><ChevronUp className="h-3 w-3" /></button>
                        <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === sorted.length - 1}><ChevronDown className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{def.label}</div>
                      <div className="text-[10px] text-muted-foreground">{def.description}</div>
                    </td>
                    <td className="px-2 py-1.5"><NumInput value={k.target} kind={def.kind} onChange={(v) => update(k.key, { target: v })} /></td>
                    <td className="px-2 py-1.5"><NumInput value={k.warn} kind={def.kind} onChange={(v) => update(k.key, { warn: v })} /></td>
                    <td className="px-2 py-1.5"><input type="checkbox" checked={k.enabled} onChange={(e) => update(k.key, { enabled: e.target.checked })} className="h-3.5 w-3.5 accent-primary" /></td>
                    <td className="px-2 py-1.5"><button onClick={() => remove(k.key)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>表示KPIがありません。右のカタログから追加してください。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Building2 className="h-3.5 w-3.5" />KPI カタログ（追加候補）</div>
        {catalogAvailable.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">すべてのカタログKPIが追加済みです。</p>
        ) : (
          <ul className="space-y-1">
            {catalogAvailable.map((def) => (
              <li key={def.key} className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-2 py-1.5 text-xs">
                <div className="flex-1">
                  <div className="font-medium">{def.label}</div>
                  <div className="text-[10px] text-muted-foreground">{def.description}</div>
                </div>
                <Chip tone="muted">{def.kind === "rate" ? "率" : def.kind === "yen" ? "¥" : "件"}</Chip>
                <button onClick={() => add(def.key)} className="inline-flex items-center gap-0.5 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-3 w-3" />追加</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NumInput({ value, kind, onChange }: { value: number; kind: "rate" | "count" | "yen"; onChange: (v: number) => void }) {
  const display = kind === "rate" ? Math.round(value * 100) : value;
  return (
    <div className="inline-flex items-center gap-1">
      <input
        type="number"
        value={display}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(kind === "rate" ? n / 100 : n);
        }}
        className="h-7 w-16 rounded-md border border-input bg-card px-1.5 text-right text-xs tabular-nums"
      />
      <span className="text-[10px] text-muted-foreground">{kind === "rate" ? "%" : kind === "yen" ? "円" : ""}</span>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block", full && "col-span-2")}>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-xs">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {desc && <div className="text-[10px] text-muted-foreground">{desc}</div>}
      </div>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
    </label>
  );
}
