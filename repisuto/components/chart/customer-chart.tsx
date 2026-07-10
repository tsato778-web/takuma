"use client";

import * as React from "react";
import { Camera, Pencil, Sparkles, User, ClipboardList, Wallet, Ticket as TicketIcon, CalendarCheck, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatCustomerNo, type Customer } from "@/lib/mock-data";
import { jpDate } from "@/lib/customer-data";
import {
  chartsForCustomer,
  intakeSections,
  CHART_STATUS_STYLE,
  SOAP_META,
  type ChartRecord,
} from "@/lib/charts";

const yen = (n: number) => `¥${n.toLocaleString()}`;

const EDIT_FIELDS: { key: keyof ChartRecord; label: string }[] = [
  { key: "soapS", label: "S：主観情報" },
  { key: "soapO", label: "O：客観情報" },
  { key: "soapA", label: "A：評価" },
  { key: "soapP", label: "P：計画" },
  { key: "treatment", label: "施術内容" },
  { key: "productsUsed", label: "使用薬剤・設定" },
  { key: "memo", label: "施術メモ" },
  { key: "nextProposal", label: "次回提案" },
  { key: "caution", label: "注意事項" },
];

export function CustomerChart({ customer, initialVisitId }: { customer: Customer; initialVisitId?: string }) {
  const [charts, setCharts] = React.useState<ChartRecord[]>(() => chartsForCustomer(customer));
  const [mode, setMode] = React.useState<"intake" | "staff">("staff");
  const [selectedId, setSelectedId] = React.useState<string | undefined>(initialVisitId ?? charts[0]?.id);

  React.useEffect(() => {
    const next = chartsForCustomer(customer);
    setCharts(next);
    setSelectedId(initialVisitId ?? next[0]?.id);
    setMode("staff");
  }, [customer, initialVisitId]);

  const selected = charts.find((r) => r.id === selectedId) ?? charts[0];

  function saveChart(u: ChartRecord) {
    setCharts((rs) => rs.map((r) => (r.id === u.id ? u : r)));
  }

  return (
    <div className="flex h-full flex-col">
      {/* 切替: お客様入力 / スタッフ記録 */}
      <div className="flex gap-2 border-b border-border px-1 pb-3">
        <SegBtn active={mode === "intake"} tone="intake" onClick={() => setMode("intake")} icon={User}>
          お客様入力カルテ<span className="ml-1 opacity-70">初回問診</span>
        </SegBtn>
        <SegBtn active={mode === "staff"} tone="staff" onClick={() => setMode("staff")} icon={ClipboardList}>
          スタッフ記録<span className="ml-1 opacity-70">来院ごと</span>
        </SegBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scrollbar pt-3">
        {mode === "intake" ? (
          <IntakeView customer={customer} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[210px_1fr]">
            {/* 左: 来院履歴 */}
            <div className="space-y-1.5">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                来院履歴（{charts.length}件）
              </div>
              {charts.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                    r.id === selected?.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tabular-nums">{jpDate(r.date)}</span>
                    <span className={cn("rounded-full px-1.5 py-px text-[9px] font-medium", CHART_STATUS_STYLE[r.status])}>
                      {r.status}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.menus}</div>
                  <div className="text-[10px] text-muted-foreground">担当 {r.staffName}</div>
                </button>
              ))}
            </div>

            {/* 右: 選択した日の詳細 */}
            <div className="min-w-0">
              {selected ? <StaffChartView record={selected} onSave={saveChart} /> : <p className="text-sm text-muted-foreground">記録がありません</p>}
            </div>
          </div>
        )}
      </div>

      {/* AI戦略の参照設計メモ */}
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/8 px-3 py-1.5 text-[11px] text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        AI戦略は「お客様入力カルテ」と「スタッフ記録」の両方を参照し、次回提案・LINE文面を生成します。
      </div>
    </div>
  );
}

function SegBtn({
  active,
  tone,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  tone: "intake" | "staff";
  onClick: () => void;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
        active
          ? tone === "intake"
            ? "border-sky-600 bg-sky-600 text-white"
            : "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-secondary"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// ===== お客様入力カルテ =====
function IntakeView({ customer }: { customer: Customer }) {
  const sections = intakeSections(customer);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border-l-4 border-sky-500 bg-sky-50/60 px-3 py-2">
        <User className="h-4 w-4 text-sky-600" />
        <div>
          <div className="text-sm font-semibold text-sky-800">お客様入力カルテ（初回問診）</div>
          <div className="text-[11px] text-sky-700/80">No.{formatCustomerNo(customer.customerNo)} ・ 初回来店時にお客様が入力</div>
        </div>
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="rounded-xl border border-sky-100 bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700">{sec.title}</div>
          <div className="space-y-0">
            {sec.fields.map((f) => (
              <div key={f.id} className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
                <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  {f.label}
                  {f.required && <span className="text-rose-500">*</span>}
                </span>
                <span className="text-right font-medium">
                  {f.type === "checkbox" ? (
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px]", f.value.includes("未") ? "bg-secondary text-muted-foreground" : "bg-emerald-100 text-emerald-700")}>
                      {f.value}
                    </span>
                  ) : (
                    f.value
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        この問診フォームは将来、管理画面から設問の追加・並び替え・必須/任意・タイプ変更や、ブランド別/店舗別テンプレートに対応予定です。
      </div>
    </div>
  );
}

// ===== スタッフ入力カルテ(1来院) =====
function StaffChartView({ record, onSave }: { record: ChartRecord; onSave: (r: ChartRecord) => void }) {
  const [editing, setEditing] = React.useState(record.status === "未記入");
  const [form, setForm] = React.useState<Partial<ChartRecord>>({});

  React.useEffect(() => {
    setForm({
      soapS: record.soapS,
      soapO: record.soapO,
      soapA: record.soapA,
      soapP: record.soapP,
      treatment: record.treatment,
      productsUsed: record.productsUsed,
      memo: record.memo,
      nextProposal: record.nextProposal,
      caution: record.caution,
    });
    setEditing(record.status === "未記入");
  }, [record]);

  function save(status: ChartRecord["status"]) {
    onSave({ ...record, ...form, status });
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">スタッフ入力カルテ</div>
            <div className="text-[11px] text-muted-foreground">
              {jpDate(record.date)} ・ 担当 {record.staffName} ・ {record.menus}
            </div>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", CHART_STATUS_STYLE[record.status])}>
          {record.status}
        </span>
      </div>

      {editing ? (
        <div className="space-y-3">
          {EDIT_FIELDS.map((f) => (
            <div key={f.key}>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{f.label}</div>
              <textarea
                value={(form[f.key] as string) ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                rows={f.key.startsWith("soap") ? 2 : 1}
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={`${f.label}を入力`}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => save("下書き")}>下書き保存</Button>
            <Button size="sm" onClick={() => save("記入済")}>記入完了</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SOAP */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOAP_META.map((m) => (
              <div key={m.key} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white", m.dot)}>{m.tag}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{m.label}</span>
                </div>
                <div className={cn("text-sm", !record[m.key] && "text-muted-foreground")}>{(record[m.key] as string) || "未記入"}</div>
              </div>
            ))}
          </div>

          {/* 施術詳細 */}
          <div className="rounded-xl border border-border bg-card p-4">
            <DetailRow label="施術内容" value={record.treatment} />
            <DetailRow label="使用薬剤・設定" value={record.productsUsed} />
            <DetailRow label="施術メモ" value={record.memo} />
            <DetailRow label="次回提案" value={record.nextProposal} />
            <DetailRow label="注意事項" value={record.caution} />
          </div>

          {/* 会計・回数券・次回予約 */}
          <div className="flex flex-wrap gap-2">
            <Chip icon={Wallet}>{record.amount > 0 ? `${yen(record.amount)}・${record.payment}` : "会計未登録"}</Chip>
            <Chip icon={TicketIcon} tone={record.ticketUsed ? "accent" : "muted"}>回数券消化：{record.ticketUsed ? "あり" : "なし"}</Chip>
            <Chip icon={CalendarCheck} tone={record.hasNextReservation ? "ok" : "warn"}>次回予約：{record.hasNextReservation ? "あり" : "なし"}</Chip>
          </div>

          {/* 写真 */}
          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">ビフォーアフター写真</div>
            <div className="flex gap-2">
              {["Before", "After"].map((lbl) => (
                <div key={lbl} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground">
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px]">{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> 編集
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("text-right", !value && "text-muted-foreground")}>{value || "未記入"}</span>
    </div>
  );
}

function Chip({ icon: Icon, children, tone = "muted" }: { icon: typeof Wallet; children: React.ReactNode; tone?: "muted" | "accent" | "ok" | "warn" }) {
  const cls = {
    muted: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/12 text-accent",
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", cls)}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
