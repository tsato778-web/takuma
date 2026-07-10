import { Crown, Ticket, CalendarCheck, Gift, Star, Sparkles, MapPin, Users } from "lucide-react";

import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { CUSTOMERS, staffById, ticketRemainingTotal } from "@/lib/mock-data";
import { jpDate } from "@/lib/customer-data";

export default function MypagePage() {
  const c = CUSTOMERS.find((x) => x.id === "cus_kobayashi")!; // VIPサンプル
  const staff = staffById(c.mainStaffId)?.name ?? "—";
  const tickets = ticketRemainingTotal(c);

  return (
    <PageShell title="LINEマイページ（プレビュー）" description="お客様がLINE上で見るマイページ。アプリ不要・LINEミニアプリ前提の設計。" action={<MockBadge />}>
      <div className="mx-auto max-w-sm overflow-hidden rounded-[28px] border-8 border-slate-800 bg-background shadow-xl">
        {/* ヘッダー */}
        <div className="bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-[11px] opacity-90"><Sparkles className="h-3.5 w-3.5" />リピスト ビューティー 渋谷店</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-lg font-bold">{c.name.slice(0, 1)}</div>
            <div>
              <div className="text-base font-semibold">{c.name} 様</div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px]"><Crown className="h-3 w-3" />VIPランク ゴールド</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="保有ポイント" value="1,240" />
            <Mini label="来店回数" value={`${c.visitCount}回`} />
            <Mini label="回数券残" value={`${tickets}回`} />
          </div>
        </div>

        {/* 本文 */}
        <div className="space-y-3 p-4">
          <Card icon={CalendarCheck} title="次回予約" sub={c.nextVisitDate ? `${jpDate(c.nextVisitDate)} ${c.nextVisitTime ?? ""}・担当 ${staff}` : "未予約"} cta={c.nextVisitDate ? "変更する" : "予約する"} />
          <Card icon={Ticket} title="回数券" sub={`スパ5回券 残${tickets}回 ・ 有効期限 2026/08/31`} cta="詳細" />
          <Card icon={Star} title="担当スタッフ" sub={`${staff}（前回：乾燥ケア／ディズニー旅行の話）`} cta="指名予約" />
          <div className="grid grid-cols-2 gap-2">
            <Promo icon={Gift} title="限定クーポン" sub="VIP限定 ヘッドスパ無料" />
            <Promo icon={Users} title="紹介特典" sub="紹介で双方1,000pt" />
            <Promo icon={MapPin} title="口コミ特典" sub="Google口コミで500pt" />
            <Promo icon={Sparkles} title="おすすめ" sub="次回：保湿フェイシャル" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">※ お客様には複雑な担当分担や内部データは見せず、ポイント・予約・特典など“また来たくなる”情報だけを表示します。</p>
    </PageShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/15 py-1.5">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[9px] opacity-90">{label}</div>
    </div>
  );
}
function Card({ icon: Icon, title, sub, cta }: { icon: typeof Gift; title: string; sub: string; cta: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">{cta}</span>
    </div>
  );
}
function Promo({ icon: Icon, title, sub }: { icon: typeof Gift; title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-2.5">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-accent"><Icon className="h-3.5 w-3.5" />{title}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
