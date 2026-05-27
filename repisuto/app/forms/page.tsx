"use client";

import * as React from "react";
import { Copy, Trash2, Link2, Folder, Plus, Eye } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell, MasterTable, Chip } from "@/components/admin/page-shell";
import { FormBuilder } from "@/components/admin/form-builder";
import { FORMS, FORM_FOLDERS, BASE_INTAKE, AFTER_SURVEY, RESPONSES } from "@/lib/forms";

type Tab = "list" | "build" | "responses";

export default function FormsPage() {
  const [tab, setTab] = React.useState<Tab>("list");
  const [folder, setFolder] = React.useState("すべて");
  return (
    <PageShell
      title="回答フォーム作成"
      description="初回問診・定期アンケート・来店後アンケートを作成。回答は顧客情報・タグ・LINE・AI戦略・KPIに連動します。"
      action={
        <div className="flex overflow-hidden rounded-md border border-border">
          {([["list", "フォーム一覧"], ["build", "フォーム作成"], ["responses", "回答一覧"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary")}>{l}</button>
          ))}
        </div>
      }
    >
      {tab === "list" && (
        <div className="flex gap-4">
          {/* フォルダ */}
          <div className="w-44 shrink-0 space-y-1">
            <button onClick={() => setTab("build")} className="mb-2 flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" />新しいフォーム</button>
            {FORM_FOLDERS.map((fo) => {
              const count = fo === "すべて" ? FORMS.length : FORMS.filter((f) => f.folder === fo).length;
              return (
                <button key={fo} onClick={() => setFolder(fo)} className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors", folder === fo ? "bg-primary/10 font-medium text-primary" : "text-foreground/70 hover:bg-secondary")}>
                  <Folder className="h-3.5 w-3.5" />
                  <span className="flex-1">{fo}</span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>

          {/* 一覧 */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">{["フォーム名", "フォルダ", "回答数", "公開状態", "LINE", "作成日", "最終更新", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {FORMS.filter((f) => folder === "すべて" || f.folder === folder).map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
                    <td className="px-3 py-2.5"><div className="font-medium">{f.name}</div><div className="text-[10px] text-muted-foreground">{f.purpose} ・ {f.fields}項目</div></td>
                    <td className="px-3 py-2.5 text-xs">{f.folder}</td>
                    <td className="px-3 py-2.5 text-xs tabular-nums">{f.responses}回答</td>
                    <td className="px-3 py-2.5">{f.status === "公開中" ? <Chip tone="ok">公開中</Chip> : <Chip tone="muted">下書き</Chip>}</td>
                    <td className="px-3 py-2.5">{f.linkedToLine ? <Chip tone="accent"><Link2 className="h-3 w-3" />連動</Chip> : <span className="text-[11px] text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{f.createdAt}</td>
                    <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{f.updatedAt}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                      <span className="inline-flex cursor-default items-center gap-0.5 hover:text-foreground"><Eye className="h-3 w-3" />プレビュー</span>
                      <span className="mx-1">·</span><span className="cursor-default hover:text-foreground" onClick={() => setTab("responses")}>回答結果</span>
                      <span className="mx-1">·</span><Copy className="inline h-3 w-3" />
                      <span className="mx-1">·</span><Trash2 className="inline h-3 w-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "build" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
            <label className="block"><span className="text-[10px] text-muted-foreground">フォーム名</span><input defaultValue="来店後アンケート" className="mt-0.5 h-8 w-64 rounded-md border border-input bg-card px-2 text-sm" /></label>
            <label className="block"><span className="text-[10px] text-muted-foreground">用途</span>
              <select className="mt-0.5 h-8 rounded-md border border-input bg-card px-2 text-sm"><option>初回問診</option><option>来店後アンケート</option><option>定期アンケート</option></select>
            </label>
            <label className="flex items-center gap-1.5 pb-1 text-xs text-muted-foreground"><input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-accent" />回答後にLINE配信と連動</label>
          </div>
          <FormBuilder initialFields={AFTER_SURVEY.map((f) => ({ ...f }))} templates={BASE_INTAKE} />
        </div>
      )}

      {tab === "responses" && (
        <div className="space-y-3">
          <MasterTable
            columns={["フォーム", "顧客", "回答日", "回答サマリー", "自動タグ"]}
            rows={RESPONSES.map((r) => [r.form, <span key="c" className="font-medium">{r.customer}</span>, r.date, r.summary, <span key="t" className="flex flex-wrap gap-1">{r.tags.map((t) => <Chip key={t} tone="accent">{t}</Chip>)}</span>])}
          />
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-[11px] text-muted-foreground">
            回答内容は <b className="text-foreground">顧客詳細</b>（基本情報・悩みタグ）、<b className="text-foreground">LINE CRM</b>（セグメント条件）、<b className="text-foreground">AI戦略</b>（提案生成）、<b className="text-foreground">KPI分析</b>（フォーム回答別の成約率）に自動連動します。
          </div>
        </div>
      )}
    </PageShell>
  );
}
