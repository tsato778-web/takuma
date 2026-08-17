import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailures,
  hashPassword,
  isThrottled,
  recordFailure,
  verifyPassword,
} from "@/lib/password";

describe("共通管理者アカウントのパスワード", () => {
  it("ハッシュ化したパスワードを照合できる", () => {
    const hash = hashPassword("naoru-recruit-2026");
    expect(verifyPassword("naoru-recruit-2026", hash)).toBe(true);
    expect(verifyPassword("naoru-recruit-2025", hash)).toBe(false);
  });

  it("同じパスワードでも毎回異なるハッシュになる（ソルト付き）", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("平文で設定されている場合も照合できる", () => {
    expect(verifyPassword("plain-secret", "plain-secret")).toBe(true);
    expect(verifyPassword("plain-secre", "plain-secret")).toBe(false);
  });

  it("空の入力は常に失敗する", () => {
    expect(verifyPassword("", hashPassword("x"))).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });

  it("壊れたハッシュ文字列でログインを通さない", () => {
    expect(verifyPassword("x", "scrypt:")).toBe(false);
    expect(verifyPassword("x", "scrypt:salt")).toBe(false);
  });

  it("ハッシュに $ を含めない（.env の変数展開と衝突するため）", () => {
    expect(hashPassword("x")).not.toContain("$");
  });
});

describe("ログイン試行の制限", () => {
  beforeEach(() => clearFailures("tester"));

  it("既定では制限されない", () => {
    expect(isThrottled("tester")).toBe(false);
  });

  it("失敗が続くと一時的に受け付けなくなる", () => {
    for (let i = 0; i < 8; i++) recordFailure("tester");
    expect(isThrottled("tester")).toBe(true);
  });

  it("一定時間が経過すると解除される", () => {
    const now = 1_000_000;
    for (let i = 0; i < 8; i++) recordFailure("tester", now);
    expect(isThrottled("tester", now)).toBe(true);
    expect(isThrottled("tester", now + 11 * 60 * 1000)).toBe(false);
  });

  it("成功したら失敗回数がリセットされる", () => {
    for (let i = 0; i < 8; i++) recordFailure("tester");
    clearFailures("tester");
    expect(isThrottled("tester")).toBe(false);
  });
});
