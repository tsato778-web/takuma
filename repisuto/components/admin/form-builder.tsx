"use client";

import * as React from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { FIELD_TYPE_LABEL, isHeading, type FieldType, type FormField, type FormTemplate } from "@/lib/forms";

const TYPES = Object.keys(FIELD_TYPE_LABEL) as FieldType[];
const needsOptions = (t: FieldType) => t === "select" || t === "radio" || t === "checkbox";
const PREFS = ["北海道", "東京都", "大阪府", "福岡県", "…"];

export function FormBuilder({
  initialFields = [],
  templates,
}: {
  initialFields?: FormField[];
  templates?: FormTemplate[];
}) {
  const [fields, setFields] = React.useState<FormField[]>(initialFields);
  const [newType, setNewType] = React.useState<FieldType>("text");

  function add() {
    const id = `f${Date.now()}`;
    const label = isHeading(newType) ? "セクション見出し" : "新しい項目";
    setFields((fs) => [...fs, { id, label, type: newType, required: false, options: needsOptions(newType) ? ["選択肢1", "選択肢2"] : undefined }]);
  }
  function update(id: string, patch: Partial<FormField>) {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function remove(id: string) {
    setFields((fs) => fs.filter((f) => f.id !== id));
  }
  function duplicate(i: number) {
    setFields((fs) => {
      const src = fs[i];
      const copy = { ...src, id: `f${Date.now()}`, options: src.options ? [...src.options] : undefined };
      return [...fs.slice(0, i + 1), copy, ...fs.slice(i + 1)];
    });
  }
  function move(i: number, dir: -1 | 1) {
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const n = [...fs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* ビルダー */}
      <div className="space-y-3">
        {templates && templates.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">ベーステンプレートから展開</div>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button key={t.id} onClick={() => setFields(t.fields.map((f) => ({ ...f })))} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary">
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <select value={f.type} onChange={(e) => { const t = e.target.value as FieldType; update(f.id, { type: t, options: needsOptions(t) ? f.options ?? ["選択肢1", "選択肢2"] : undefined }); }} className="h-8 shrink-0 rounded-md border border-input bg-card px-1.5 text-xs">
                  {TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
                </select>
                <button onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-4 w-4" /></button>
                <button onClick={() => duplicate(i)} title="複製" className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              {needsOptions(f.type) && (
                <input value={(f.options ?? []).join(", ")} onChange={(e) => update(f.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="選択肢をカンマ区切りで" className="mt-2 w-full rounded-md border border-input bg-card px-2 py-1 text-xs" />
              )}
              {!isHeading(f.type) && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} className="h-3.5 w-3.5 accent-primary" />必須</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={!!f.tagOnAnswer} onChange={(e) => update(f.id, { tagOnAnswer: e.target.checked })} className="h-3.5 w-3.5 accent-accent" />回答をタグ化</label>
                  {f.mapTo && <span className="rounded bg-secondary px-1.5 py-0.5">顧客項目: {f.mapTo}</span>}
                </div>
              )}
            </div>
          ))}
          {fields.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">項目を追加してください</div>}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
          <select value={newType} onChange={(e) => setNewType(e.target.value as FieldType)} className="h-8 rounded-md border border-input bg-card px-2 text-xs">
            {TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
          </select>
          <button onClick={add} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Plus className="h-3.5 w-3.5" />項目を追加</button>
        </div>
      </div>

      {/* プレビュー */}
      <div className="lg:sticky lg:top-0">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">プレビュー（お客様入力画面）</div>
          <div className="space-y-3">
            {fields.map((f) =>
              f.type === "heading" ? (
                <div key={f.id} className="border-b border-border pb-1 pt-1 text-sm font-bold text-foreground">{f.label}</div>
              ) : f.type === "subheading" ? (
                <div key={f.id} className="text-xs font-semibold text-muted-foreground">{f.label}</div>
              ) : (
                <div key={f.id}>
                  <label className="mb-1 block text-xs font-medium">
                    {f.label}
                    {f.required && <span className="ml-1 text-rose-500">*</span>}
                  </label>
                  <FieldPreview field={f} />
                </div>
              )
            )}
            <button className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground">送信する</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldPreview({ field: f }: { field: FormField }) {
  const base = "w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm text-muted-foreground";
  switch (f.type) {
    case "textarea":
      return <div className={cn(base, "h-14")}>入力エリア</div>;
    case "select":
      return <div className={cn(base, "flex items-center justify-between")}>選択してください<ChevronDown className="h-3.5 w-3.5" /></div>;
    case "radio":
    case "checkbox":
      return (
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => (
            <span key={o} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className={cn("h-3.5 w-3.5 border border-input", f.type === "radio" ? "rounded-full" : "rounded")} />{o}
            </span>
          ))}
        </div>
      );
    case "date":
      return <div className={base}>YYYY / MM / DD</div>;
    case "number":
      return <div className={base}>0</div>;
    case "prefecture":
      return <div className={cn(base, "flex items-center justify-between")}>{PREFS[0]}<ChevronDown className="h-3.5 w-3.5" /></div>;
    case "file":
      return <div className={cn(base, "flex h-12 items-center justify-center border-dashed")}>＋ ファイルを添付</div>;
    case "image":
      return <div className={cn(base, "flex h-16 items-center justify-center border-dashed")}>＋ 画像をアップロード</div>;
    case "consent":
      return <label className="flex items-start gap-2 text-xs text-muted-foreground"><span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input" />{f.label}</label>;
    default:
      return <div className={base}>入力</div>;
  }
}
