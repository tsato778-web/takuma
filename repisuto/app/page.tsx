import Link from "next/link";
import { Repeat, AlertTriangle, Star, Users, ArrowRight, Sparkles } from "lucide-react";

import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { CUSTOMERS } from "@/lib/mock-data";
import { repeatRateOverall, reviewRateOverall, referralCountOverall } from "@/lib/repeat-rate";
import { churnRiskCount } from "@/lib/churn";

const pct = (n: number) => `${Math.round(n * 100)}%`;
type Tone = "emerald" | "amber" | "sky" | "rose";

export default function HomePage() {
  const repeatRate = repeatRateOverall();
  const churn = churnRiskCount(3);
  const reviewRate = reviewRateOverall();
  const referrals = referralCountOverall();
  return (
    <PageShell
      title="ホーム ― 再来率向上CRM"
      description="売上ではなく『再来率』を中心に経営する4指標。各KPIから対応機能へジャンプできます。"
      action={<MockBadge />}
    >
      {/* 思想 */}
      <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" />リピストの本質</div>
        <p className="mt-0.5 text-foreground/80">リピストは予約管理ではなく <b>「再来率向上システム」</b>。ホーム/KPIでは売上よりも <b>次回予約率・離脱リスク人数・口コミ取得率・紹介発生数</b> を重要指標として扱います。</p>
      </div>

      {/* 4 重要KPI */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Repeat} tone="emerald" label="次回予約率" value={pct(repeatRate)} sub={`登録顧客 ${CUSTOMERS.length} 名のうち`} link="/repeat" linkLabel="次回予約率ダッシュボード" />
        <KpiCard icon={AlertTriangle} tone="amber" label="離脱リスク人数" value={`${churn} 名`} sub="★3 以上の顧客" link="/churn-risk" linkLabel="離脱リスク管理" />
        <KpiCard icon={Star} tone="sky" label="口コミ取得率" value={pct(reviewRate)} sub="Google／ホットペッパー" link="/google-business" linkLabel="Googleマップ連携" />
        <KpiCard icon={Users} tone="rose" label="紹介発生数" value={`${referrals} 件`} sub="紹介タグ／媒体" link="/customers" linkLabel="顧客一覧" />
      </div>

      {/* KPI の行先（思想連動の明示） */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="mb-1 font-semibold">KPI の行先（指標が動いたら何を見るか）</div>
        <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
          <li>次回予約率が下がる → <Link href="/repeat" className="text-primary hover:underline">/repeat</Link> でスタッフ別／媒体別／メニュー別に分解</li>
          <li>離脱リスク人数が増える → <Link href="/churn-risk" className="text-primary hover:underline">/churn-risk</Link> で個別に推奨アクションを実行</li>
          <li>口コミ取得率が低い → 会計後の依頼導線（<Link href="/pos" className="text-primary hover:underline">/pos</Link>）＋ Googleマップ連携</li>
          <li>紹介発生数が低い → <Link href="/line/state-delivery" className="text-primary hover:underline">/line/state-delivery</Link> で「VIP・口コミ済」状態への紹介オファー</li>
        </ul>
      </div>

      {/* 会計から再来率への流れ */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="mb-1 font-semibold">会計＝CRMの起点</div>
        <p className="text-muted-foreground">会計はゴールではなく <b>次回予約 → 口コミ取得 → 完了</b> の起点です。会計画面（<Link href="/pos" className="text-primary hover:underline">/pos</Link>）から次回予約・口コミ送信まで1画面で完結します。</p>
      </div>
    </PageShell>
  );
}

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  link,
  linkLabel,
}: {
  icon: typeof Repeat;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  link: string;
  linkLabel: string;
}) {
  const palette: Record<Tone, string> = {
    emerald: "border-emerald-200 bg-emerald-50/40 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/40 text-amber-700",
    sky: "border-sky-200 bg-sky-50/40 text-sky-700",
    rose: "border-rose-200 bg-rose-50/40 text-rose-700",
  };
  return (
    <Link href={link} className={`flex flex-col rounded-xl border ${palette[tone]} p-4 transition-colors hover:opacity-90`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      <div className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium">{linkLabel}<ArrowRight className="h-3 w-3" /></div>
    </Link>
  );
}
