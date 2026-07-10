import { Gift, Crown, Star, Users, Cake, Sparkles } from "lucide-react";

import { PageShell, MasterTable, AddButton, Chip } from "@/components/admin/page-shell";

const EARN = [
  { icon: Star, label: "来店ポイント", detail: "1来店ごとに付与", pt: "+100pt" },
  { icon: Star, label: "口コミ投稿ポイント", detail: "Google/HPB口コミ投稿", pt: "+500pt" },
  { icon: Users, label: "紹介ポイント", detail: "紹介で双方に付与", pt: "+1,000pt" },
  { icon: Cake, label: "誕生日ポイント", detail: "誕生月に自動付与", pt: "+500pt" },
];

const REWARDS = [
  { label: "限定メニュー解放", detail: "VIP限定の特別メニューを予約可能に", tone: "accent" as const, pt: "2,000pt" },
  { label: "先行予約権", detail: "人気枠・イベントの先行予約", tone: "accent" as const, pt: "1,500pt" },
  { label: "回数券 更新特典", detail: "回数券更新時の限定ボーナス", tone: "ok" as const, pt: "1,000pt" },
  { label: "限定商品交換", detail: "サロン専売品・ノベルティ", tone: "default" as const, pt: "1,200pt" },
];

const RANKS = [
  ["新規", "初回来店", "—"],
  ["継続", "2回以上来店", "誕生日特典"],
  ["優良", "5回以上 / 回数券保有", "限定クーポン"],
  ["VIP", "10回以上 / 口コミ・紹介", "先行予約・限定メニュー"],
  ["ファン", "紹介発生 / 高LTV", "特別イベント招待"],
];

export default function PointsPage() {
  return (
    <PageShell
      title="ポイント"
      description="“割引”ではなく“また来たい理由”を作るためのポイント制度。特別感・限定感・体験価値を重視。"
      action={<AddButton label="ポイントルール作成" />}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ポイント付与ルール</div>
          <div className="space-y-2">
            {EARN.map((e) => {
              const Icon = e.icon;
              return (
                <div key={e.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></div>
                  <div className="flex-1"><div className="text-sm font-medium">{e.label}</div><div className="text-[11px] text-muted-foreground">{e.detail}</div></div>
                  <Chip tone="accent">{e.pt}</Chip>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">交換特典（割引ではなく体験価値）</div>
          <div className="space-y-2">
            {REWARDS.map((r) => (
              <div key={r.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><Gift className="h-4 w-4" /></div>
                <div className="flex-1"><div className="text-sm font-medium">{r.label}</div><div className="text-[11px] text-muted-foreground">{r.detail}</div></div>
                <Chip tone={r.tone}>{r.pt}</Chip>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Crown className="h-3.5 w-3.5 text-amber-500" />ファン化ステータス（ランク）</div>
        <MasterTable columns={["ランク", "条件", "特典"]} rows={RANKS.map((r) => [<span key="r" className="font-medium">{r[0]}</span>, r[1], r[2]])} />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/8 px-3 py-2 text-[11px] text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        安売りCRMにしない方針：ポイントは「特別感・限定感・VIP感・体験価値」を作り、再来理由とファン化に繋げます。
      </div>
    </PageShell>
  );
}
