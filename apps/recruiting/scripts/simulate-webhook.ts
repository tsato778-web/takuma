/**
 * LINE の Webhook を模したリクエストを送り、一連の処理を確認する開発用スクリプト。
 * 実際の LINE アカウントが無くても、友だち追加からトーク履歴保存までを検証できる。
 *
 *   npm run line:simulate -- follow
 *   npm run line:simulate -- message "面談を希望します"
 *   npm run line:simulate -- unfollow
 *   npm run line:simulate -- follow --user U_test_002
 *
 * 送信先は SIMULATE_URL（既定 http://localhost:3000）。
 */
import { randomUUID } from "node:crypto";
import { signLineBody } from "../lib/line/signature";

type EventType = "follow" | "unfollow" | "message" | "postback";

const args = process.argv.slice(2);
const type = (args[0] ?? "follow") as EventType;

const userFlagIndex = args.indexOf("--user");
const userId =
  userFlagIndex >= 0 ? args[userFlagIndex + 1] : "U_simulator_000000000001";

const freeArg = args[1] && !args[1].startsWith("--") ? args[1] : undefined;

const baseUrl = process.env.SIMULATE_URL ?? "http://localhost:3000";
const secret = process.env.LINE_CHANNEL_SECRET;

if (!secret) {
  console.error(
    "LINE_CHANNEL_SECRET が未設定です。.env に検証用の値を設定してください。",
  );
  process.exit(1);
}

function buildEvent() {
  const base = {
    type,
    webhookEventId: `SIM${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    timestamp: Date.now(),
    mode: "active",
    source: { type: "user", userId },
    deliveryContext: { isRedelivery: false },
  };

  switch (type) {
    case "message":
      return {
        ...base,
        replyToken: randomUUID().replace(/-/g, ""),
        message: {
          id: `SIMMSG${Date.now()}`,
          type: "text",
          text: freeArg ?? "こんにちは。求人を見て連絡しました。",
        },
      };
    case "postback":
      return {
        ...base,
        replyToken: randomUUID().replace(/-/g, ""),
        postback: { data: freeArg ?? '{"a":"add_tag","id":"unknown"}' },
      };
    case "follow":
      return { ...base, replyToken: randomUUID().replace(/-/g, "") };
    default:
      return base;
  }
}

async function main() {
  const body = JSON.stringify({
    destination: "Usimulatordestination",
    events: [buildEvent()],
  });

  const signature = signLineBody(body, secret!);

  const res = await fetch(`${baseUrl}/api/line/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-line-signature": signature,
    },
    body,
  });

  console.log(`POST ${baseUrl}/api/line/webhook -> ${res.status}`);
  console.log(await res.text());

  if (!res.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
