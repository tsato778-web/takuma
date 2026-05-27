// 強制リンク(媒体別予約URL)のデータ設計。
// 1リンク = 店舗×媒体×キャンペーン×広告セット×広告×訴求×メニュー×タグ×テンプレート。
// 経由予約は顧客・予約・会計・LTVに媒体タグを引き継ぐ前提。

export type LinkStatus = "稼働中" | "停止" | "下書き";

export interface ForceLink {
  id: string;
  title: string;
  storeId: string;
  media: string;
  campaign: string;
  appeal: string;
  menu: string;
  tag: string;
  templateId: string;
  status: LinkStatus;
  url: string;
  visits: number; // 流入
  reservations: number; // 予約
  visited: number; // 来店
  ltv: number; // 経由顧客の平均LTV
  createdAt: string;
}

export const LINK_MEDIA = ["Meta広告", "Instagram", "Google広告", "ホットペッパー", "TikTok", "紹介"];
export const LINK_CAMPAIGNS = ["肩こり訴求", "腰痛訴求", "美容整体訴求", "初回限定"];
export const LINK_APPEALS = ["初回1,980円", "初回2,980円", "無料カウンセリング"];
export const LINK_MENUS = ["整体60分", "美容整体", "ヘッドスパ", "フェイシャル"];
export const LINK_TEMPLATES = ["Aテンプレート", "Bテンプレート", "整体用", "エステ用"];

const BASE = "https://reserve.repisuto.app";

export function buildUrl(p: { storeId: string; media: string; campaign: string; appeal: string; menu: string; tag: string }): string {
  const slug = `${p.media}-${p.campaign}-${p.appeal}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase() || "ad";
  const params = new URLSearchParams({
    store: p.storeId,
    utm_source: p.media,
    utm_campaign: p.campaign,
    utm_content: p.appeal,
    menu: p.menu,
    tag: p.tag,
  });
  return `${BASE}/${p.storeId}/r/${slug}?${params.toString()}`;
}

export const LINKS: ForceLink[] = [
  { id: "1638", title: "Meta × 肩こり × 初回1,980円 × 女性30代", storeId: "shibuya", media: "Meta広告", campaign: "肩こり訴求", appeal: "初回1,980円", menu: "整体60分", tag: "肩こり", templateId: "Aテンプレート", status: "稼働中", url: `${BASE}/shibuya/r/metakatakori?utm_source=meta`, visits: 1840, reservations: 132, visited: 98, ltv: 84000, createdAt: "2026-05-26" },
  { id: "1637", title: "Instagram × 美容整体 × 無料カウンセリング", storeId: "shibuya", media: "Instagram", campaign: "美容整体訴求", appeal: "無料カウンセリング", menu: "美容整体", tag: "小顔", templateId: "Bテンプレート", status: "稼働中", url: `${BASE}/shibuya/r/igbeauty?utm_source=instagram`, visits: 1240, reservations: 88, visited: 61, ltv: 76000, createdAt: "2026-05-22" },
  { id: "1636", title: "Google広告 × 腰痛 × 初回2,980円", storeId: "shinjuku", media: "Google広告", campaign: "腰痛訴求", appeal: "初回2,980円", menu: "整体60分", tag: "腰痛", templateId: "整体用", status: "稼働中", url: `${BASE}/shinjuku/r/gyoutsu?utm_source=google`, visits: 960, reservations: 54, visited: 40, ltv: 68000, createdAt: "2026-05-21" },
  { id: "1635", title: "TikTok × 肩こり × 初回1,980円", storeId: "shibuya", media: "TikTok", campaign: "肩こり訴求", appeal: "初回1,980円", menu: "整体60分", tag: "肩こり", templateId: "Aテンプレート", status: "停止", url: `${BASE}/shibuya/r/ttkatakori?utm_source=tiktok`, visits: 420, reservations: 18, visited: 11, ltv: 52000, createdAt: "2026-05-18" },
  { id: "1634", title: "ホットペッパー × フェイシャル初回", storeId: "ginza", media: "ホットペッパー", campaign: "初回限定", appeal: "初回2,980円", menu: "フェイシャル", tag: "美容", templateId: "エステ用", status: "稼働中", url: `${BASE}/ginza/r/hpbfacial?utm_source=hpb`, visits: 2100, reservations: 164, visited: 121, ltv: 91000, createdAt: "2026-05-15" },
];
