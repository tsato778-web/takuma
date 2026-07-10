import { Clock, Bell, Download, ShieldCheck } from "lucide-react";

import { PageShell } from "@/components/admin/page-shell";

const SECTIONS = [
  { icon: Clock, title: "営業時間・休業日", desc: "店舗の営業時間、定休日、臨時休業を設定します。" },
  { icon: Bell, title: "通知設定", desc: "予約・キャンセル・要フォローの通知ルールを管理します。" },
  { icon: Download, title: "データのエクスポート / インポート", desc: "顧客・予約・売上データの入出力（CSV）。" },
  { icon: ShieldCheck, title: "権限・セキュリティ", desc: "ロール権限、ログイン履歴、二段階認証。" },
];

export default function MaintenancePage() {
  return (
    <PageShell title="メンテナンス" description="システム全般の管理・運用設定。">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
