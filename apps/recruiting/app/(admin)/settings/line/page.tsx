import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { checkConnection, isDryRun, isLineConfigured } from "@/lib/line/client";

export const dynamic = "force-dynamic";

async function webhookUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/line/webhook`;
}

export default async function LineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string }>;
}) {
  const { check } = await searchParams;
  const url = await webhookUrl();
  const configured = isLineConfigured();
  const dryRun = isDryRun();

  const connection = check === "1" && configured ? await checkConnection() : null;

  const [pendingJobs, failedJobs, unprocessedEvents, recentEvents] = await Promise.all([
    prisma.messageJob.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.messageJob.count({ where: { status: "failed" } }).catch(() => 0),
    prisma.webhookEvent.count({ where: { processedAt: null } }).catch(() => 0),
    prisma.webhookEvent
      .findMany({
        orderBy: { receivedAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          receivedAt: true,
          processedAt: true,
          processError: true,
        },
      })
      .catch(() => []),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold">LINE公式アカウント設定</h1>
      <p className="mt-1 text-sm text-[--color-muted]">
        接続状況の確認と Webhook URL の案内
      </p>

      {/* Webhook URL */}
      <section className="mt-6 rounded-xl border border-[--color-border] bg-white p-5">
        <h2 className="text-[15px] font-semibold">Webhook URL</h2>
        <p className="mt-1 text-[13px] text-[--color-muted]">
          LINE Developers Console の Messaging API 設定に、この URL を登録してください。
        </p>
        <code className="mt-3 block break-all rounded-lg bg-[--color-surface-2] px-3 py-2 text-[13px]">
          {url}
        </code>
      </section>

      {/* 接続状況 */}
      <section className="mt-4 rounded-xl border border-[--color-border] bg-white p-5">
        <h2 className="text-[15px] font-semibold">接続状況</h2>

        <dl className="mt-3 space-y-2 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-[--color-muted]">チャネル設定</dt>
            <dd>
              {configured ? (
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                  設定済み
                </span>
              ) : (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-800">
                  未設定（LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN）
                </span>
              )}
            </dd>
          </div>

          <div className="flex items-center justify-between">
            <dt className="text-[--color-muted]">実送信</dt>
            <dd>
              {dryRun ? (
                <span className="rounded bg-slate-100 px-2 py-0.5">
                  停止中（DRY_RUN・実際には送信しません）
                </span>
              ) : (
                <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">
                  有効（実際に候補者へ届きます）
                </span>
              )}
            </dd>
          </div>

          <div className="flex items-center justify-between">
            <dt className="text-[--color-muted]">未処理のイベント</dt>
            <dd>{unprocessedEvents}件</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[--color-muted]">送信待ちジョブ</dt>
            <dd>{pendingJobs}件</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[--color-muted]">失敗したジョブ</dt>
            <dd className={failedJobs > 0 ? "text-red-600" : undefined}>
              {failedJobs}件
            </dd>
          </div>
        </dl>

        <form className="mt-4" action="/settings/line">
          <input type="hidden" name="check" value="1" />
          <button
            type="submit"
            disabled={!configured}
            className="rounded-lg border border-[--color-border] px-3 py-1.5 text-[13px] font-medium hover:bg-[--color-surface-2] disabled:opacity-40"
          >
            接続確認（LINE API を呼び出します）
          </button>
        </form>

        {connection ? (
          connection.ok ? (
            <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-[13px] text-emerald-900">
              <p className="font-semibold">接続に成功しました</p>
              <p className="mt-1">
                アカウント名：{connection.botName}（{connection.basicId}） / 応答モード：
                {connection.chatMode}
              </p>
              {connection.quota !== undefined ? (
                <p className="mt-0.5">
                  当月の無料メッセージ：{connection.used ?? 0} / {connection.quota} 通
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
              <p className="font-semibold">接続できませんでした</p>
              <p className="mt-1 break-all">{connection.message}</p>
            </div>
          )
        ) : null}
      </section>

      {/* 直近のイベント */}
      <section className="mt-4 rounded-xl border border-[--color-border] bg-white p-5">
        <h2 className="text-[15px] font-semibold">直近の受信イベント</h2>
        {recentEvents.length === 0 ? (
          <p className="mt-2 text-[13px] text-[--color-muted]">
            まだ受信していません。
          </p>
        ) : (
          <table className="mt-3 w-full text-[13px]">
            <thead className="text-left text-[12px] text-[--color-muted]">
              <tr>
                <th className="pb-1.5 font-medium">種別</th>
                <th className="pb-1.5 font-medium">受信</th>
                <th className="pb-1.5 font-medium">処理</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="border-t border-[--color-border]">
                  <td className="py-1.5">{event.type}</td>
                  <td className="py-1.5">
                    {new Intl.DateTimeFormat("ja-JP", {
                      timeZone: "Asia/Tokyo",
                      dateStyle: "short",
                      timeStyle: "medium",
                    }).format(event.receivedAt)}
                  </td>
                  <td className="py-1.5">
                    {event.processedAt ? (
                      <span className="text-emerald-700">完了</span>
                    ) : event.processError ? (
                      <span className="text-red-600">失敗</span>
                    ) : (
                      <span className="text-[--color-muted]">待機中</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="mt-4 text-[12px] text-[--color-muted]">
        リッチメニュー・テンプレートの設定は Sprint 7 で実装します。
      </p>
    </div>
  );
}
