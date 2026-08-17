import { describe, expect, it } from "vitest";
import { signLineBody, verifyLineSignature } from "@/lib/line/signature";
import {
  hasDownloadableContent,
  lineWebhookBodySchema,
  parsePostbackData,
  toMessageType,
} from "@/lib/line/types";
import { blockToMessage, renderText } from "@/lib/line/templates";
import { backoffMinutes, MAX_ATTEMPTS } from "@/lib/jobs/queue";

const SECRET = "test-channel-secret";

describe("Webhook の署名検証", () => {
  const body = JSON.stringify({ events: [{ type: "follow" }] });

  it("正しい署名を受け入れる", () => {
    const signature = signLineBody(body, SECRET);
    expect(verifyLineSignature(body, signature, SECRET)).toBe(true);
  });

  it("ボディが1文字でも変われば拒否する", () => {
    const signature = signLineBody(body, SECRET);
    expect(verifyLineSignature(body + " ", signature, SECRET)).toBe(false);
  });

  it("別のシークレットで作られた署名を拒否する", () => {
    const signature = signLineBody(body, "another-secret");
    expect(verifyLineSignature(body, signature, SECRET)).toBe(false);
  });

  it("署名やシークレットが無い場合は拒否する", () => {
    expect(verifyLineSignature(body, null, SECRET)).toBe(false);
    expect(verifyLineSignature(body, signLineBody(body, SECRET), "")).toBe(false);
  });

  it("JSON を再生成すると署名が変わる（生ボディで検証する必要がある）", () => {
    const signature = signLineBody(body, SECRET);
    const reserialized = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyLineSignature(reserialized, signature, SECRET)).toBe(false);
  });
});

describe("Webhook ペイロードの解析", () => {
  it("友だち追加イベントを読み取れる", () => {
    const parsed = lineWebhookBodySchema.parse({
      destination: "U123",
      events: [
        {
          type: "follow",
          webhookEventId: "EVT1",
          timestamp: 1_700_000_000_000,
          source: { type: "user", userId: "U_abc" },
          replyToken: "token",
        },
      ],
    });
    expect(parsed.events[0].source?.userId).toBe("U_abc");
    expect(parsed.events[0].webhookEventId).toBe("EVT1");
  });

  it("未知のイベント種別や追加フィールドがあっても壊れない", () => {
    const parsed = lineWebhookBodySchema.parse({
      events: [
        {
          type: "somethingNew",
          futureField: { nested: true },
          source: { type: "user", userId: "U_abc" },
        },
      ],
    });
    expect(parsed.events[0].type).toBe("somethingNew");
  });

  it("events が無い場合は空配列になる", () => {
    expect(lineWebhookBodySchema.parse({}).events).toEqual([]);
  });

  it("メッセージ種別を写像する", () => {
    expect(toMessageType("text")).toBe("text");
    expect(toMessageType("image")).toBe("image");
    expect(toMessageType("unknown-type")).toBe("text");
  });

  it("本体取得が必要な種別を判別する", () => {
    expect(hasDownloadableContent("image")).toBe(true);
    expect(hasDownloadableContent("video")).toBe(true);
    expect(hasDownloadableContent("text")).toBe(false);
    expect(hasDownloadableContent("sticker")).toBe(false);
  });
});

describe("postback データ", () => {
  it("想定した形式を解釈する", () => {
    expect(parsePostbackData('{"a":"add_tag","id":"tag-1"}')).toEqual({
      a: "add_tag",
      id: "tag-1",
    });
  });

  it("未知のアクションや壊れた JSON は null を返す", () => {
    expect(parsePostbackData('{"a":"drop_database"}')).toBeNull();
    expect(parsePostbackData("not json")).toBeNull();
    expect(parsePostbackData("")).toBeNull();
  });
});

describe("テンプレートの組み立て", () => {
  it("差し込み変数を置換する", () => {
    expect(renderText("{{name}} さん、こんにちは", { name: "山田" })).toBe(
      "山田 さん、こんにちは",
    );
  });

  it("値が無い変数は空文字にする", () => {
    expect(renderText("{{name}}さん", { name: null })).toBe("さん");
    expect(renderText("{{unknown}}です", {})).toBe("です");
  });

  it("テキストブロックをメッセージに変換する", () => {
    expect(blockToMessage("text", { text: "本文" }, null, {})).toEqual({
      type: "text",
      text: "本文",
    });
  });

  it("空のテキストは送信対象にしない", () => {
    expect(blockToMessage("text", { text: "  " }, null, {})).toBeNull();
  });

  it("画像はメディアURLを優先して使う", () => {
    expect(
      blockToMessage(
        "image",
        { originalContentUrl: "https://example.com/a.png" },
        "https://cdn.example.com/b.png",
        {},
      ),
    ).toEqual({
      type: "image",
      originalContentUrl: "https://cdn.example.com/b.png",
      previewImageUrl: "https://cdn.example.com/b.png",
    });
  });

  it("URL が無い画像・プレビューが無い動画は送らない", () => {
    expect(blockToMessage("image", {}, null, {})).toBeNull();
    expect(
      blockToMessage("video", { originalContentUrl: "https://example.com/v.mp4" }, null, {}),
    ).toBeNull();
  });
});

describe("ジョブの再試行間隔", () => {
  it("失敗が続くほど間隔が広がる", () => {
    expect(backoffMinutes(1)).toBe(1);
    expect(backoffMinutes(2)).toBe(5);
    expect(backoffMinutes(3)).toBe(30);
    expect(backoffMinutes(4)).toBe(120);
  });

  it("上限を超えても最後の値を返す", () => {
    expect(backoffMinutes(99)).toBe(360);
    expect(backoffMinutes(0)).toBe(1);
  });

  it("試行回数の上限が設定されている", () => {
    expect(MAX_ATTEMPTS).toBeGreaterThan(1);
  });
});
