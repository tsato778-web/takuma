// クライアント側から API を叩くための薄いラッパ。
// 型は既存の mock-data.ts の Reservation を再利用（DB のカラム構造も同じ形）。

import type { Reservation } from "./mock-data";

const JSON_HEADERS = { "Content-Type": "application/json" };

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export const reservationsApi = {
  list(params?: { dateKey?: string; storeId?: string }): Promise<Reservation[]> {
    const q = new URLSearchParams();
    if (params?.dateKey) q.set("dateKey", params.dateKey);
    if (params?.storeId) q.set("storeId", params.storeId);
    return fetch(`/api/reservations?${q.toString()}`, { cache: "no-store" }).then(jsonOrThrow);
  },
  create(r: Reservation): Promise<Reservation> {
    return fetch(`/api/reservations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(r),
    }).then(jsonOrThrow);
  },
  patch(id: string, patch: Partial<Reservation>): Promise<Reservation> {
    return fetch(`/api/reservations/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    }).then(jsonOrThrow);
  },
  remove(id: string): Promise<{ ok: true }> {
    return fetch(`/api/reservations/${id}`, { method: "DELETE" }).then(jsonOrThrow);
  },
};
