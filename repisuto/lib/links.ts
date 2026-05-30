// 強制リンク(媒体別予約URL)のデータ設計。
// 1リンク = 店舗×媒体×キャンペーン×広告セット×広告×訴求×メニュー×タグ×テンプレート。
// 経由予約は顧客・予約・会計・LTVに媒体タグを引き継ぐ前提。
// 広告リンクでは「予約時の初期状態」(メニュー強制・指名不可・担当欄非表示など)を固定できる。

export type LinkStatus = "稼働中" | "停止" | "下書き";

export interface ForceLink {
  id: string;
  title: string;
  storeId: string;
  media: string;
  campaign: string;
  appeal: string;
  menu: string; // 旧: 表示用メニュー名
  tag: string;
  templateId: string;
  status: LinkStatus;
  url: string;
  visits: number; // 流入
  reservations: number; // 予約
  visited: number; // 来店
  ltv: number; // 経由顧客の平均LTV
  createdAt: string;

  // ---- 予約時の初期状態（広告リンク向け） ----
  menuIds?: string[]; // 強制選択するメニューID（複数可）
  allowMenuChange?: boolean; // メニュー変更可否（false=変更不可）。未指定=true
  allowNomination?: boolean; // 担当指名可否。未指定=true
  showStaffSelector?: boolean; // 担当者選択欄の表示。未指定=true
  forcedStaffId?: string; // 強制担当者（おまかせ確定時の自動割当先）
  adName?: string; // 広告名
  autoTags?: string[]; // 経由予約に自動付与するタグ

  // ---- テンプレート（4種類）----
  personalInfoTemplateId?: string;
  confirmTemplateId?: string;
  thanksTemplateId?: string;
  reminderTemplateId?: string;
}

// 予約画面に渡す解決済みプリフィル（lib/booking と Customer Booking で使用）
export interface LinkPrefill {
  linkId: string;
  title: string;
  storeId: string;
  menuIds: string[];
  allowMenuChange: boolean;
  allowNomination: boolean;
  showStaffSelector: boolean;
  forcedStaffId?: string;
  source: string; // 流入媒体
  campaign: string;
  adName?: string;
  autoTags: string[];
  templates: { personalInfo?: string; confirm?: string; thanks?: string; reminder?: string };
}

export const LINK_MEDIA = ["Meta広告", "Instagram", "Google広告", "ホットペッパー", "TikTok", "紹介"];
export const LINK_CAMPAIGNS = ["肩こり訴求", "腰痛訴求", "美容整体訴求", "初回限定", "矯正訴求", "小顔訴求"];
export const LINK_APPEALS = ["初回1,980円", "初回2,980円", "無料カウンセリング"];
export const LINK_MENUS = ["整体60分", "美容整体", "ヘッドスパ", "フェイシャル"];
export const LINK_TEMPLATES = ["Aテンプレート", "Bテンプレート", "整体用", "エステ用"];
export const PI_TEMPLATES = ["標準（氏名・電話・メール）", "整体用（症状・痛みレベル）", "美容用（肌タイプ・髪悩み）", "広告LP用（最小項目）"];
export const CONFIRM_TEMPLATES = ["標準", "高級感・余白多め", "初回限定特典付き"];
export const THANKS_TEMPLATES = ["標準（LINE追加導線）", "問診票誘導つき", "紹介特典つき"];
export const REMINDER_TEMPLATES = ["前日朝", "前日夜・お店の思い", "3時間前リマインド"];

const BASE = "https://reserve.repisuto.app";

export function buildUrl(p: { storeId: string; media: string; campaign: string; appeal: string; menu: string; tag: string; linkId?: string }): string {
  const slug = `${p.media}-${p.campaign}-${p.appeal}`.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase() || "ad";
  const params = new URLSearchParams({
    store: p.storeId,
    utm_source: p.media,
    utm_campaign: p.campaign,
    utm_content: p.appeal,
    menu: p.menu,
    tag: p.tag,
  });
  if (p.linkId) params.set("link", p.linkId);
  return `${BASE}/${p.storeId}/r/${slug}?${params.toString()}`;
}

export const LINKS: ForceLink[] = [
  // 広告リンク: 矯正メニュー強制・指名不可・担当欄非表示（仕様の代表例）
  { id: "1639", title: "Meta × 矯正訴求 × 初回1,980円（メニュー強制・指名不可）", storeId: "shibuya", media: "Meta広告", campaign: "矯正訴求", appeal: "初回1,980円", menu: "パーマ", tag: "矯正",
    templateId: "Aテンプレート", status: "稼働中",
    url: `${BASE}/shibuya/r/metakyousei?link=1639`, visits: 760, reservations: 52, visited: 38, ltv: 88000, createdAt: "2026-05-27",
    menuIds: ["menu_perm"], allowMenuChange: false, allowNomination: false, showStaffSelector: false,
    adName: "矯正LP_v2_30代女性",
    autoTags: ["広告", "矯正訴求", "Meta経由"],
    personalInfoTemplateId: "広告LP用（最小項目）", confirmTemplateId: "高級感・余白多め", thanksTemplateId: "標準（LINE追加導線）", reminderTemplateId: "前日夜・お店の思い" },
  // 広告リンク: VIP強制指名（メニュー側のFORCEDと組み合わせ）
  { id: "1638-vip", title: "Instagram × 田中スペシャルVIP（強制指名）", storeId: "shibuya", media: "Instagram", campaign: "美容整体訴求", appeal: "無料カウンセリング", menu: "田中スペシャルVIP", tag: "VIP",
    templateId: "Bテンプレート", status: "稼働中",
    url: `${BASE}/shibuya/r/igvip?link=1638-vip`, visits: 430, reservations: 28, visited: 21, ltv: 124000, createdAt: "2026-05-25",
    menuIds: ["menu_vip"], allowMenuChange: false, allowNomination: true, showStaffSelector: false, forcedStaffId: "stf_tanaka",
    adName: "VIP訴求_インフルエンサーコラボ", autoTags: ["広告", "VIP訴求"] },
  // 既存リンク（プリフィル未設定＝通常リンク）
  { id: "1637", title: "Instagram × 美容整体 × 無料カウンセリング", storeId: "shibuya", media: "Instagram", campaign: "美容整体訴求", appeal: "無料カウンセリング", menu: "美容整体", tag: "小顔", templateId: "Bテンプレート", status: "稼働中", url: `${BASE}/shibuya/r/igbeauty?utm_source=instagram`, visits: 1240, reservations: 88, visited: 61, ltv: 76000, createdAt: "2026-05-22" },
  { id: "1636", title: "Google広告 × 腰痛 × 初回2,980円", storeId: "shinjuku", media: "Google広告", campaign: "腰痛訴求", appeal: "初回2,980円", menu: "整体60分", tag: "腰痛", templateId: "整体用", status: "稼働中", url: `${BASE}/shinjuku/r/gyoutsu?utm_source=google`, visits: 960, reservations: 54, visited: 40, ltv: 68000, createdAt: "2026-05-21" },
  { id: "1635", title: "TikTok × 肩こり × 初回1,980円", storeId: "shibuya", media: "TikTok", campaign: "肩こり訴求", appeal: "初回1,980円", menu: "整体60分", tag: "肩こり", templateId: "Aテンプレート", status: "停止", url: `${BASE}/shibuya/r/ttkatakori?utm_source=tiktok`, visits: 420, reservations: 18, visited: 11, ltv: 52000, createdAt: "2026-05-18" },
  { id: "1634", title: "ホットペッパー × フェイシャル初回", storeId: "ginza", media: "ホットペッパー", campaign: "初回限定", appeal: "初回2,980円", menu: "フェイシャル", tag: "美容", templateId: "エステ用", status: "稼働中", url: `${BASE}/ginza/r/hpbfacial?utm_source=hpb`, visits: 2100, reservations: 164, visited: 121, ltv: 91000, createdAt: "2026-05-15" },
];

// id からプリフィルを解決（未設定フィールドは既定値で補完）
export function linkPrefillFor(linkId: string): LinkPrefill | null {
  const l = LINKS.find((x) => x.id === linkId);
  if (!l) return null;
  return {
    linkId: l.id,
    title: l.title,
    storeId: l.storeId,
    menuIds: l.menuIds ?? [],
    allowMenuChange: l.allowMenuChange ?? true,
    allowNomination: l.allowNomination ?? true,
    showStaffSelector: l.showStaffSelector ?? true,
    forcedStaffId: l.forcedStaffId,
    source: l.media,
    campaign: l.campaign,
    adName: l.adName,
    autoTags: l.autoTags ?? (l.tag ? [l.tag] : []),
    templates: {
      personalInfo: l.personalInfoTemplateId,
      confirm: l.confirmTemplateId,
      thanks: l.thanksTemplateId,
      reminder: l.reminderTemplateId,
    },
  };
}

// リンクが「予約初期状態」を固定しているか（一覧表示用）
export function hasPrefill(l: ForceLink): boolean {
  return !!(l.menuIds?.length || l.allowMenuChange === false || l.allowNomination === false || l.showStaffSelector === false || l.forcedStaffId);
}
