"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { useBrand } from "@/lib/brand-context";
import { KPI_CATALOG, kpiByKey, formatKpiValue, kpiHealth, type KpiHealth } from "@/lib/brand-kpi";

export default function HomePage() {
  const { brand } = useBrand();
  const enabled = brand.kpis.filter((k) => k.enabled).sort((a, b) => a.order - b.order);

  return (
    <PageShell
      title={`ホーム ― ${brand.name}`}
      description={`このブランドのKPIを設定順に表示しています。ブランドを切り替えると表示KPIも切り替わります。`}
      action={<MockBadge />}
    >
      {/* 思想 */}
      <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" />リピストの本質</div>
        <p className="mt-0.5 text-foreground/80">業種ではなく <b>ブランド</b> に最適化される再来率向上CRM。ホームでは <b>次回予約率・離脱リスク・口コミ・紹介・LTV</b> など、ブランドごとに重要なKPIを順序付きで表示します。</p>
      </div>

      {/* 動的KPI */}
      {enabled.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-6 text-center text-xs text-muted-foreground">
          このブランドには表示KPIが設定されていません。<Link href="/master/brands" className="ml-1 text-primary hover:underline">ブランドマスター</Link>でKPIを追加してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {enabled.map((k) => {
            const def = kpiByKey(k.key);
            if (!def) return null;
            const value = def.compute();
            const health = kpiHealth(k.key, value, k.target, k.warn);
            return (
              <KpiCard
                key={k.key}
                label={def.label}
                value={formatKpiValue(def.kind, value)}
                target={formatKpiValue(def.kind, k.target)}
                health={health}
                link={linkFor(k.key)}
                linkLabel={linkLabelFor(k.key)}
              />
            );
          })}
        </div>
      )}

      {/* KPI の行先（連動先の明示） */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="mb-1 font-semibold">KPI の行先（指標が動いたら何を見るか）</div>
        <ul className="ml-4 list-disc space-y-0.5 text-muted-foreground">
          <li>次回予約率が下がる → <Link href="/repeat" className="text-primary hover:underline">/repeat</Link> でスタッフ別／媒体別／メニュー別に分解</li>
          <li>離脱リスク人数が増える → <Link href="/churn-risk" className="text-primary hover:underline">/churn-risk</Link> で個別に推奨アクション</li>
          <li>口コミ取得率が低い → 会計後の依頼導線（<Link href="/pos" className="text-primary hover:underline">/pos</Link>）＋ Googleマップ連携</li>
          <li>紹介発生数が低い → <Link href="/line/state-delivery" className="text-primary hover:underline">/line/state-delivery</Link> で「VIP・口コミ済」状態への紹介オファー</li>
          <li>KPI 自体を編集 → <Link href="/master/brands" className="text-primary hover:underline">ブランドマスター</Link>（追加/削除/順序/目標値）</li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="mb-1 font-semibold">会計＝CRMの起点</div>
        <p className="text-muted-foreground">会計はゴールではなく <b>次回予約 → 口コミ取得 → 完了</b> の起点です。会計画面（<Link href="/pos" className="text-primary hover:underline">/pos</Link>）から次回予約・口コミ送信まで1画面で完結します。</p>
      </div>

      {/* カタログ全リスト（未追加KPIへの誘導） */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="mb-1 font-semibold">KPI カタログ</div>
        <p className="text-muted-foreground">このブランドに追加できる標準KPI。<Link href="/master/brands" className="text-primary hover:underline">ブランドマスター</Link>から有効化してください。</p>
        <ul className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
          {KPI_CATALOG.map((k) => {
            const enabled = brand.kpis.some((bk) => bk.key === k.key && bk.enabled);
            return (
              <li key={k.key} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                <span className="font-medium">{k.label}</span>
                <span className="text-[10px] text-muted-foreground">{k.description}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}

const TONE: Record<KpiHealth, string> = {
  ok: "border-emerald-200 bg-emerald-50/40 text-emerald-700",
  warn: "border-amber-200 bg-amber-50/40 text-amber-700",
  bad: "border-rose-200 bg-rose-50/40 text-rose-700",
};

function KpiCard({ label, value, target, health, link, linkLabel }: { label: string; value: string; target: string; health: KpiHealth; link: string; linkLabel: string }) {
  return (
    <Link href={link} className={`flex flex-col rounded-xl border p-4 transition-colors hover:opacity-90 ${TONE[health]}`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">目標 {target}</div>
      <div className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium">{linkLabel}<ArrowRight className="h-3 w-3" /></div>
    </Link>
  );
}

function linkFor(key: string): string {
  switch (key) {
    case "repeat_rate": return "/repeat";
    case "churn_risk": return "/churn-risk";
    case "review_rate": return "/google-business";
    case "referral_count": return "/customers";
    case "ltv_avg":
    case "avg_visits": return "/analytics";
    case "member_rate":
    case "ticket_holder_rate": return "/tickets";
    default: return "/analytics";
  }
}
function linkLabelFor(key: string): string {
  switch (key) {
    case "repeat_rate": return "次回予約率ダッシュボード";
    case "churn_risk": return "離脱リスク管理";
    case "review_rate": return "Googleマップ連携";
    case "referral_count": return "顧客一覧";
    case "ltv_avg":
    case "avg_visits": return "KPI 分析";
    case "member_rate": return "回数券・会員";
    case "ticket_holder_rate": return "回数券・会員";
    default: return "KPI 分析";
  }
}
