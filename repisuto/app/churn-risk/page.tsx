import Link from "next/link";
import { AlertTriangle, MessageCircle, Gift, UserCheck, Send } from "lucide-react";

import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { formatCustomerNo, staffById } from "@/lib/mock-data";
import { rankedByChurn } from "@/lib/churn";

export default function ChurnRiskPage() {
  const ranked = rankedByChurn();
  const high = ranked.filter((r) => r.result.score >= 3).length;
  const mid = ranked.filter((r) => r.result.score === 2).length;
  return (
    <PageShell
      title="離脱リスク管理"
      description="再来しなくなる顧客を先回りして抽出し、推奨アクションで失客復帰を狙います。"
      action={<MockBadge />}
    >
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Mini label="高リスク（★3 以上）" value={`${high}名`} tone="rose" />
        <Mini label="要注意（★2）" value={`${mid}名`} tone="amber" />
        <Mini label="対象全顧客" value={`${ranked.length}名`} tone="muted" />
      </div>

      <div className="space-y-2">
        {ranked.map(({ customer: c, result: r }) => (
          <div key={c.id} className={`rounded-xl border p-3 ${r.score >= 3 ? "border-rose-200 bg-rose-50/30" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {c.name}
                  <span className="text-[11px] font-normal text-muted-foreground tabular-nums">No.{formatCustomerNo(c.customerNo)}</span>
                  {c.tags.includes("VIP") && <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">VIP</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">前回担当：{staffById(c.lastStaffId)?.name ?? "-"} ／ 来店 {c.visitCount} 回 ／ LTV ¥{c.ltv.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <Stars score={r.score} />
                <div className="text-[10px] text-muted-foreground">離脱危険度</div>
              </div>
            </div>

            {r.reasons.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] font-semibold text-muted-foreground">推定理由</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {r.reasons.map((rs) => <span key={rs} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{rs}</span>)}
                </div>
              </div>
            )}

            <div className="mt-2">
              <div className="text-[10px] font-semibold text-muted-foreground">推奨アクション</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {r.actions.map((a, i) => (
                  <button key={i} type="button" className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium hover:bg-secondary">
                    {iconFor(a)}
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <Link href={`/customers/${c.id}`} className="text-primary hover:underline">顧客詳細を開く</Link>
              <span className="text-muted-foreground tabular-nums">最終来店 {c.lastVisitDate.replace(/-/g, "/")}（{r.days}日前）</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUI。スコアは「来店間隔／次回予約／LINE連携／回数券残／口コミ／担当変更履歴」を合成。本実装ではLINE開封率と担当変更回数の実データを使用。</p>
    </PageShell>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <span className="text-[14px] tabular-nums" aria-label={`離脱危険度 ${score} / 5`}>
      <span className="text-rose-500">{"★".repeat(score)}</span>
      <span className="text-muted-foreground/30">{"★".repeat(5 - score)}</span>
    </span>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: "rose" | "amber" | "muted" }) {
  const palette = {
    rose: "border-rose-200 bg-rose-50/40 text-rose-700",
    amber: "border-amber-200 bg-amber-50/40 text-amber-700",
    muted: "border-border bg-card text-foreground",
  }[tone];
  return (
    <div className={`rounded-xl border ${palette} p-3`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function iconFor(action: string) {
  if (action.includes("LINE")) return <MessageCircle className="h-3 w-3 text-primary" />;
  if (action.includes("クーポン")) return <Gift className="h-3 w-3 text-accent" />;
  if (action.includes("担当")) return <UserCheck className="h-3 w-3 text-foreground" />;
  if (action.includes("口コミ")) return <Send className="h-3 w-3 text-amber-600" />;
  if (action.includes("回数券")) return <Gift className="h-3 w-3 text-accent" />;
  return <AlertTriangle className="h-3 w-3 text-muted-foreground" />;
}
