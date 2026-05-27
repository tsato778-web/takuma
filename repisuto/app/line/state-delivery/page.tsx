import { ArrowRight, Zap } from "lucide-react";

import { PageShell, MasterTable, Chip } from "@/components/admin/page-shell";
import { CUSTOMERS, ticketRemainingTotal, isChurnRisk, isNewCustomer, type Customer } from "@/lib/mock-data";
import { daysBetween } from "@/lib/customer-data";

const TODAY = "2026-05-27";
const daysSince = (c: Customer) => daysBetween(c.lastVisitDate, TODAY);
const reviewed = (c: Customer) => c.tags.includes("Google口コミ済") || c.tags.includes("HPB口コミ済");

interface StateDef {
  label: string;
  match: (c: Customer) => boolean;
  trigger: string;
  content: string;
  action: string;
  tone: "ok" | "accent" | "warn" | "default";
}

const STATES: StateDef[] = [
  { label: "初回 × 次回予約あり", match: (c) => isNewCustomer(c) && !!c.nextVisitDate, trigger: "来店3日前", content: "来店前リマインド＋お店の思い／VIP導線", action: "継続サポート配信へ", tone: "ok" },
  { label: "初回 × 次回予約なし", match: (c) => isNewCustomer(c) && !c.nextVisitDate, trigger: "来店翌日→3日→7日→14日", content: "不安解消→Before/After→限定クーポン→再来導線", action: "再来促進シナリオ起動", tone: "warn" },
  { label: "回数券 残1", match: (c) => ticketRemainingTotal(c) === 1, trigger: "残数到達時", content: "回数券の更新案内（限定特典つき）", action: "更新オファー自動送信", tone: "accent" },
  { label: "60日未来店（失客予備軍）", match: (c) => daysSince(c) >= 60, trigger: "最終来店60日経過", content: "復帰キャンペーン／お久しぶりメッセージ", action: "失客復帰フロー起動", tone: "warn" },
  { label: "VIP顧客", match: (c) => c.tags.includes("VIP"), trigger: "ランク到達／不定期", content: "限定先行予約・特別イベント・限定メニュー", action: "VIP限定配信へ", tone: "accent" },
  { label: "口コミ未投稿（高満足）", match: (c) => !reviewed(c) && c.visitCount >= 3, trigger: "来店後・高満足時", content: "Google/ホットペッパー口コミ依頼＋特典", action: "口コミ依頼配信", tone: "default" },
  { label: "離反リスク（残0×次回なし）", match: (c) => isChurnRisk(c), trigger: "状態遷移時", content: "限定オファー付きリマインド", action: "要フォローリスト＋配信", tone: "warn" },
];

const TONE: Record<StateDef["tone"], "ok" | "accent" | "warn" | "muted"> = { ok: "ok", accent: "accent", warn: "warn", default: "muted" };

const KPI_ROWS = [
  ["初回フォロー（次回予約なし）", "62%", "48%", "—", "31%"],
  ["回数券 更新案内", "—", "—", "41%", "22%"],
  ["60日 復帰キャンペーン", "28%", "19%", "12%", "—"],
  ["VIP限定 先行予約", "84%", "73%", "—", "—"],
  ["口コミ依頼", "—", "—", "—", "38%"],
];

export default function StateDeliveryPage() {
  return (
    <PageShell
      title="状態別配信"
      description="顧客の“状態”に応じて配信内容・導線を自動で出し分け。状態が変わると配信も自動で切り替わります。"
      action={<span className="cursor-default rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">＋ 状態ルール作成</span>}
    >
      <div className="space-y-2">
        {STATES.map((s) => {
          const n = CUSTOMERS.filter(s.match).length;
          return (
            <div key={s.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex min-w-[180px] items-center gap-2">
                <Chip tone={TONE[s.tone]}>{s.label}</Chip>
                <span className="text-xs font-semibold tabular-nums text-foreground">{n}名</span>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{s.trigger}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="text-foreground">{s.content}</span>
              </div>
              <Chip tone="accent">{s.action}</Chip>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/8 px-3 py-2 text-[11px] text-accent">
        <Zap className="h-3.5 w-3.5" />
        状態が変わると（例：次回予約なし→予約あり、回数券残1→更新）配信フローも自動で切り替わります。「人が頑張る」ではなく「システムが再来店を自動設計」します。
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">配信施策別の効果（KPI連動）</div>
        <MasterTable columns={["配信施策", "再来率", "次回予約率", "クーポン利用率", "口コミ投稿率"]} rows={KPI_ROWS} />
        <p className="mt-2 text-[11px] text-muted-foreground">※ モック。実装ではLINE開封率・失客復帰率・LTV・紹介率まで配信施策ごとに計測します。</p>
      </div>
    </PageShell>
  );
}
