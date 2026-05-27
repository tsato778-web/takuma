import { PageShell, MasterTable, AddButton, Chip } from "@/components/admin/page-shell";
import { STAFF } from "@/lib/mock-data";

const ROLES = ["店長", "スタイリスト", "スタイリスト", "アシスタント"];

export default function StaffMasterPage() {
  const rows = STAFF.map((s, i) => [
    <span key="n" className="inline-flex items-center gap-1.5 font-medium"><span className="h-3 w-3 rounded-full" style={{ background: s.color }} />{s.name}</span>,
    s.name.split(" ")[0],
    ROLES[i] ?? "スタッフ",
    s.acceptsNomination ? <Chip key="nm" tone="accent">指名可</Chip> : <Chip key="nm" tone="muted">指名不可</Chip>,
    "1",
    String(i + 1),
    "渋谷店",
    <Chip key="st" tone="ok">在籍</Chip>,
  ]);
  // 退職（論理削除）の例
  rows.push([
    <span key="n" className="inline-flex items-center gap-1.5 font-medium text-muted-foreground"><span className="h-3 w-3 rounded-full bg-slate-300" />中島 由紀</span>,
    "中島",
    "スタイリスト",
    <Chip key="nm" tone="muted">指名不可</Chip>,
    "—",
    "—",
    "渋谷店",
    <Chip key="st" tone="muted">退職・非表示</Chip>,
  ]);

  return (
    <PageShell title="スタッフマスター" description="権限・対応メニュー・指名可否・表示順などを設定。削除は退職／非表示の論理削除です。" action={<AddButton label="スタッフ登録" />}>
      <MasterTable columns={["スタッフ", "表示名", "権限", "指名", "受付可能数", "表示順", "所属店舗", "状態"]} rows={rows} />
      <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-semibold text-foreground">登録項目（モック）</div>
        スタッフ名 ／ 表示名 ／ 権限 ／ 対応メニュー ／ 指名可・不可 ／ 受付可能数 ／ 表示順 ／ 所属店舗 ／ Googleカレンダー連携 ／ 退職・非表示設定（論理削除）
      </div>
    </PageShell>
  );
}
