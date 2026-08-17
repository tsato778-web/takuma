/**
 * エラー通知の入口。
 * Sprint 0 ではサーバーログへの出力のみ。Sentry を導入する際はここだけ差し替える
 * （呼び出し側のコードは変更不要）。
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    at: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };
  console.error("[error]", JSON.stringify(payload));
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  console.warn("[warn]", JSON.stringify({ at: new Date().toISOString(), message, ...context }));
}
