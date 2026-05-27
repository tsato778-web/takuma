import { Calendar, MessageCircle, CreditCard, Instagram, Globe } from "lucide-react";

import { PageShell, Chip } from "@/components/admin/page-shell";

const ITEMS = [
  { icon: MessageCircle, name: "LINE公式アカウント", desc: "メッセージ配信・友だち連携", status: "ok" as const },
  { icon: Calendar, name: "Googleカレンダー", desc: "スタッフ予定の双方向同期（予定）", status: "soon" as const },
  { icon: CreditCard, name: "決済（Stripe / Square）", desc: "キャッシュレス決済の連携", status: "soon" as const },
  { icon: Instagram, name: "Meta広告 / Instagram", desc: "媒体トラッキング・流入計測", status: "soon" as const },
  { icon: Globe, name: "ホットペッパービューティー", desc: "予約・口コミの取り込み", status: "soon" as const },
];

export default function IntegrationsPage() {
  return (
    <PageShell title="外部連携" description="外部サービスとの連携設定。">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{it.name}</div>
                <div className="text-[11px] text-muted-foreground">{it.desc}</div>
              </div>
              {it.status === "ok" ? <Chip tone="ok">連携済み</Chip> : <Chip tone="muted">準備中</Chip>}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
