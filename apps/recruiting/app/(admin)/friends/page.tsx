import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const JST = "Asia/Tokyo";

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function FriendsPage() {
  const friends = await prisma.lineFriend
    .findMany({
      orderBy: { followedAt: "desc" },
      take: 200,
      include: {
        candidate: {
          include: {
            stage: { select: { name: true, color: true } },
            tags: { include: { tag: { select: { name: true } } } },
            conversation: { select: { lastMessageAt: true, handlingStatus: true } },
            _count: { select: { messages: true } },
          },
        },
      },
    })
    .catch(() => []);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">友だち情報</h1>
          <p className="mt-1 text-sm text-[--color-muted]">
            LINE の友だち一覧（新しい順・最大200件）
          </p>
        </div>
        <span className="text-[13px] text-[--color-muted]">{friends.length}件</span>
      </div>

      {friends.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[--color-border] bg-white p-8 text-center">
          <p className="text-sm font-semibold">まだ友だちがいません</p>
          <p className="mt-1 text-[13px] text-[--color-muted]">
            LINE 公式アカウントを友だち追加すると、ここに自動で表示されます。
          </p>
          <p className="mt-3 text-[12px] text-[--color-muted]">
            接続状況は{" "}
            <Link href="/settings/line" className="text-[--color-brand] underline">
              LINE公式アカウント設定
            </Link>{" "}
            で確認できます。
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-[--color-border] bg-white">
          <table className="w-full text-[13px]">
            <thead className="border-b border-[--color-border] bg-[--color-surface-2] text-left text-[12px] text-[--color-muted]">
              <tr>
                <th className="px-4 py-2.5 font-medium">表示名</th>
                <th className="px-4 py-2.5 font-medium">選考フェーズ</th>
                <th className="px-4 py-2.5 font-medium">タグ</th>
                <th className="px-4 py-2.5 font-medium">登録日時</th>
                <th className="px-4 py-2.5 font-medium">最終メッセージ</th>
                <th className="px-4 py-2.5 font-medium">件数</th>
                <th className="px-4 py-2.5 font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {friends.map((friend) => (
                <tr
                  key={friend.id}
                  className="border-b border-[--color-border] last:border-0"
                >
                  <td className="px-4 py-2.5">
                    {friend.displayName ?? friend.candidate.displayName ?? "（名前未取得）"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: friend.candidate.stage.color }}
                      />
                      {friend.candidate.stage.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {friend.candidate.tags.map((t) => (
                        <span
                          key={t.tagId}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]"
                        >
                          {t.tag.name}
                        </span>
                      ))}
                      {friend.candidate.tags.length === 0 ? (
                        <span className="text-[--color-muted]">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{formatDateTime(friend.followedAt)}</td>
                  <td className="px-4 py-2.5">
                    {formatDateTime(friend.candidate.conversation?.lastMessageAt ?? null)}
                  </td>
                  <td className="px-4 py-2.5">{friend.candidate._count.messages}</td>
                  <td className="px-4 py-2.5">
                    {friend.isBlocked ? (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">
                        ブロック
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
                        有効
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[12px] text-[--color-muted]">
        候補者詳細・トーク画面は Sprint 2 / Sprint 6 で実装します。
      </p>
    </div>
  );
}
