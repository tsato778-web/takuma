// 通知のモックデータ。store_id 単位で分離して保持する。
// reservationId があるものは、クリックで対象予約へジャンプできる。

import { dateKey, STORE, STORES } from "./mock-data";

export type NotificationType =
  | "NEW_RESERVATION" // 新規予約
  | "CHANGE_RESERVATION" // 予約変更
  | "CANCEL" // キャンセル
  | "LINE_MESSAGE" // LINEメッセージ
  | "UNPAID" // 未会計
  | "NO_CHART"; // 未カルテ

export interface AppNotification {
  id: string;
  storeId: string; // 通知は店舗単位で分離
  type: NotificationType;
  message: string;
  reservationId?: string; // ジャンプ先の予約(無い場合は情報通知)
  dateKey: string; // ジャンプ時に切り替える日付
  timeLabel: string; // 相対時刻ラベル
  read: boolean;
}

function buildSeed(): AppNotification[] {
  const today = dateKey(new Date());
  return [
    // ===== 渋谷店 =====
    { id: "n1", storeId: STORE.id, type: "NEW_RESERVATION", message: "加藤 結衣さんから 5月27日14:30 に予約が入りました", reservationId: "r6", dateKey: today, timeLabel: "たった今", read: false },
    { id: "n2", storeId: STORE.id, type: "LINE_MESSAGE", message: "山田 花子さんからLINEメッセージが届きました", reservationId: "r1", dateKey: today, timeLabel: "5分前", read: false },
    { id: "n3", storeId: STORE.id, type: "CHANGE_RESERVATION", message: "斎藤 美月さんの予約が 15:00 に変更されました", reservationId: "r7", dateKey: today, timeLabel: "22分前", read: false },
    { id: "n4", storeId: STORE.id, type: "NO_CHART", message: "山田 花子さんのカルテが未記入です（10:00 カット+カラー）", reservationId: "r1", dateKey: today, timeLabel: "1時間前", read: false },
    { id: "n5", storeId: STORE.id, type: "UNPAID", message: "中村 ゆいさんが未会計です（13:00 ヘッドスパ）", reservationId: "r4", dateKey: today, timeLabel: "1時間前", read: false },
    { id: "n6", storeId: STORE.id, type: "CANCEL", message: "本田 みなみさんが 5月27日16:00 の予約をキャンセルしました", dateKey: today, timeLabel: "2時間前", read: true },

    // ===== 新宿店(store_id分離の確認用 / 渋谷店では表示されない) =====
    { id: "n7", storeId: STORES[1].id, type: "NEW_RESERVATION", message: "東 リカさんから 5月27日11:00 に予約が入りました", dateKey: today, timeLabel: "10分前", read: false },
    { id: "n8", storeId: STORES[1].id, type: "UNPAID", message: "森 健太さんが未会計です（新宿店 12:00）", dateKey: today, timeLabel: "40分前", read: false },
  ];
}

export const SEED_NOTIFICATIONS: AppNotification[] = buildSeed();
