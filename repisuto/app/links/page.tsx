"use client";

import * as React from "react";
import { Copy, Check, Link2, Plus } from "lucide-react";

import { PageShell, Chip } from "@/components/admin/page-shell";

const BASE = "https://reserve.repisuto.app/shibuya";
const LINKS = [
  { media: "Meta広告", src: "meta", visits: 184, color: "#1877f2" },
  { media: "Instagram", src: "instagram", visits: 142, color: "#e1306c" },
  { media: "Google広告", src: "google", visits: 96, color: "#4285f4" },
  { media: "ホットペッパー", src: "hpb", visits: 210, color: "#f0a13b" },
  { media: "紹介", src: "referral", visits: 64, color: "#0ea5b7" },
];

export default function LinksPage() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = (url: string, key: string) => {
    navigator.clipboard?.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  };

  return (
    <PageShell
      title="強制リンク作成"
      description="媒体ごとに予約URLを発行。経由した予約は顧客・予約・会計・LTVに媒体タグが引き継がれます。"
      action={<span className="inline-flex cursor-default items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" />リンク作成</span>}
    >
      <div className="space-y-3">
        {LINKS.map((l) => {
          const url = `${BASE}?src=${l.src}&utm_source=${l.src}&utm_medium=cpc`;
          return (
            <div key={l.src} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: l.color }}>
                  <Link2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{l.media}用 予約URL</span>
                <Chip tone="accent">媒体タグ：{l.media}</Chip>
                <span className="ml-auto text-[11px] text-muted-foreground">流入 {l.visits}件</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">{url}</code>
                <button onClick={() => copy(url, l.src)} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-2 text-xs font-medium hover:bg-secondary">
                  {copied === l.src ? <><Check className="h-3.5 w-3.5 text-emerald-600" />コピー済</> : <><Copy className="h-3.5 w-3.5" />コピー</>}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                テンプレート:
                <Chip tone="muted">個人情報入力</Chip>
                <Chip tone="muted">確認画面</Chip>
                <Chip tone="muted">サンクスページ</Chip>
                <Chip tone="muted">リマインド</Chip>
                <Chip tone="muted">タグ</Chip>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUIです。発行URLごとにテンプレート（個人情報入力／確認／サンクス／リマインド／タグ）を割り当てられます。</p>
    </PageShell>
  );
}
