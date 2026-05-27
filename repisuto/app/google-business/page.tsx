import { Star, MessageSquare, MapPin, TrendingUp, Reply, AlertCircle } from "lucide-react";

import { PageShell, MasterTable, Chip } from "@/components/admin/page-shell";

const STORE_REVIEWS = [
  { store: "渋谷店", count: 412, rating: 4.7, unreplied: 3, rate: 28 },
  { store: "新宿店", count: 286, rating: 4.5, unreplied: 7, rate: 22 },
  { store: "銀座店", count: 198, rating: 4.8, unreplied: 1, rate: 31 },
];
const RECENT = [
  { name: "M.K", store: "渋谷店", rating: 5, text: "肩こりが本当に楽になりました。担当の方も丁寧で…", replied: true, date: "5/26" },
  { name: "Y.T", store: "渋谷店", rating: 4, text: "予約も取りやすく通いやすいです。", replied: false, date: "5/25" },
  { name: "A.S", store: "新宿店", rating: 5, text: "カウンセリングが丁寧で安心できました。", replied: false, date: "5/24" },
];
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function GoogleBusinessPage() {
  const total = STORE_REVIEWS.reduce((s, r) => s + r.count, 0);
  const avg = (STORE_REVIEWS.reduce((s, r) => s + r.rating * r.count, 0) / total).toFixed(2);
  const unreplied = STORE_REVIEWS.reduce((s, r) => s + r.unreplied, 0);

  return (
    <PageShell title="Googleマップ" description="Googleビジネスプロフィール連携。口コミ状況の確認とCRM連動。" action={<Chip tone="muted">API連携：準備中（モック）</Chip>}>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={MessageSquare} label="Google口コミ数" value={`${total}`} />
        <Kpi icon={Star} label="平均星評価" value={avg} tone="amber" />
        <Kpi icon={Reply} label="未返信口コミ" value={`${unreplied}件`} tone="warn" />
        <Kpi icon={TrendingUp} label="口コミ取得率" value="27%" tone="accent" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">店舗別評価</div>
          <MasterTable
            columns={["店舗", "口コミ数", "平均", "未返信", "取得率"]}
            rows={STORE_REVIEWS.map((r) => [
              <span key="s" className="inline-flex items-center gap-1 font-medium"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.store}</span>,
              `${r.count}`,
              <span key="r" className="text-amber-600">★ {r.rating}</span>,
              r.unreplied > 0 ? <Chip key="u" tone="warn">{r.unreplied}件</Chip> : <Chip key="u" tone="ok">0</Chip>,
              `${r.rate}%`,
            ])}
          />
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">直近の口コミ</div>
          <div className="space-y-2">
            {RECENT.map((r, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-amber-500">{stars(r.rating)}</span>
                  <span className="text-[11px] text-muted-foreground">{r.store} ・ {r.date}</span>
                  {r.replied ? <Chip tone="ok">返信済</Chip> : <Chip tone="warn">未返信</Chip>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CRM連動</div>
          <p className="text-sm text-muted-foreground">会計時の口コミチェックと連動し、顧客タグへ自動付与します。</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="ok">Google口コミ済み</Chip>
            <Chip tone="accent">Google口コミ依頼済み</Chip>
            <Chip tone="muted">口コミ未依頼</Chip>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground"><AlertCircle className="h-3.5 w-3.5" />将来的な活用（設計済み）</div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            <li>・口コミ依頼対象者リスト（来店後・高満足度の自動抽出）</li>
            <li>・口コミ依頼LINEテンプレートの自動送信</li>
            <li>・未返信口コミの通知</li>
            <li>・口コミ評価 × リピート率の相関分析</li>
            <li>・店舗別口コミランキング</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Star; label: string; value: string; tone?: "amber" | "warn" | "accent" }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${tone === "warn" ? "border-amber-200 bg-amber-50/50" : "border-border"}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone === "amber" ? "text-amber-500" : tone === "warn" ? "text-amber-500" : tone === "accent" ? "text-accent" : ""}`} />
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "amber" ? "text-amber-600" : tone === "warn" ? "text-amber-700" : tone === "accent" ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
