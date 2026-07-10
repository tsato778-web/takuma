import { PageShell, MasterTable, AddButton, Chip } from "@/components/admin/page-shell";
import { MENUS, MENU_COLOR } from "@/lib/mock-data";
import { TICKET_PLANS, yen } from "@/lib/pos";

const CATEGORY: Record<string, string> = {
  menu_cut: "ヘア",
  menu_color: "ヘア",
  menu_perm: "ヘア",
  menu_treat: "スパ・トリートメント",
  menu_spa: "スパ・トリートメント",
  menu_face: "フェイシャル",
};

export default function MenusMasterPage() {
  return (
    <PageShell
      title="メニューマスター"
      description="店舗ごとに自由にメニューを作成。価格・時間・インターバル・回数券対象・予約表示などを設定します。"
      action={<AddButton label="メニュー作成" />}
    >
      <MasterTable
        columns={["メニュー", "カテゴリー", "価格", "所要", "ｲﾝﾀｰﾊﾞﾙ", "カラー", "回数券", "予約表示"]}
        rows={MENUS.map((m) => {
          const ticket = TICKET_PLANS.find((t) => t.menus === m.name);
          return [
            <span key="n" className="font-medium">{m.name}</span>,
            CATEGORY[m.id] ?? "—",
            yen(m.price),
            `${m.durationMin}分`,
            m.intervalMin > 0 ? `${m.intervalMin}分` : "—",
            <span key="c" className={`inline-block h-3.5 w-3.5 rounded-full ${MENU_COLOR[m.color].dot}`} />,
            ticket ? <Chip key="t" tone="accent">対象（消化{yen(Math.round(ticket.price / ticket.count))}）</Chip> : <Chip key="t" tone="muted">対象外</Chip>,
            <Chip key="v" tone="ok">表示</Chip>,
          ];
        })}
      />
      <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">メニュー作成で設定できる項目（モック）</div>
        メニュー名 ／ カテゴリー ／ 新規・既存・会員・非会員別の出し分け ／ 価格 ／ 所要時間 ／ インターバル時間 ／ 受付可能数 ／ 対応スタッフ ／
        予約ページ表示・非表示 ／ コースカラー ／ 回数券対象・消化単価・有効期限 ／ 画像
      </div>
    </PageShell>
  );
}
