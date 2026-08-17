import { getDashboardSummary } from "@/lib/dashboard";
import { DEFAULT_YEAR_AXIS, yearAxisLabel } from "@/lib/fiscal-year";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">採用ダッシュボード</h1>
          <p className="mt-1 text-sm text-[--color-muted]">
            集計軸：{yearAxisLabel(DEFAULT_YEAR_AXIS)}（既定）／切替は Sprint 6 で実装
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-[--color-muted]">
          Sprint 0：基盤構築
        </span>
      </div>

      {!summary.ready ? (
        <SetupNotice reason={summary.reason} />
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-[--color-border] bg-white p-5">
            <p className="text-[13px] text-[--color-muted]">登録候補者（LINE友だち含む）</p>
            <p className="mt-1 text-3xl font-bold">{summary.totalCandidates}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            {summary.stages.map((stage) => (
              <div
                key={stage.code}
                className="rounded-xl border border-[--color-border] bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <p className="text-[12px] text-[--color-muted]">{stage.name}</p>
                </div>
                <p className="mt-1 text-2xl font-bold">{stage.count}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[12px] text-[--color-muted]">
            各数字から候補者一覧への遷移、年度・新卒/中途・資格・エリアでの絞り込みは
            Sprint 6 で実装します。
          </p>
        </>
      )}
    </div>
  );
}

function SetupNotice({ reason }: { reason: "no_database_url" | "unreachable" }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm font-semibold text-amber-900">
        {reason === "no_database_url"
          ? "データベースが未設定です"
          : "データベースに接続できません"}
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-amber-900">
        <li>Supabase でプロジェクトを作成し、接続文字列を取得する</li>
        <li>
          <code className="rounded bg-white/70 px-1">DATABASE_URL</code> を .env
          （または Vercel の環境変数）に設定する
        </li>
        <li>
          <code className="rounded bg-white/70 px-1">npm run db:deploy</code>{" "}
          でテーブルを作成する
        </li>
        <li>
          <code className="rounded bg-white/70 px-1">npm run db:seed</code>{" "}
          で選考フェーズ・タグ・ユーザーの初期データを投入する
        </li>
      </ol>
      <p className="mt-3 text-[12px] text-amber-800">
        詳細な手順は apps/recruiting/README.md を参照してください。
      </p>
    </div>
  );
}
