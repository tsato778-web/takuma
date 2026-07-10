// 顧客詳細・LINE CRM・分析のモックデータ生成。
// 顧客IDから決定論的に生成し、リロードしても同じ内容になるようにする。

import { MENUS, STAFF, type Customer } from "./mock-data";

export const TODAY = "2026-05-27";

function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
export function jpDate(s: string): string {
  const d = parseISO(s);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
}

// 次回予約の表示ラベル ("5/30(金) 14:00")。なければ null
export function nextVisitLabel(c: { nextVisitDate?: string; nextVisitTime?: string }): string | null {
  if (!c.nextVisitDate) return null;
  return `${jpDate(c.nextVisitDate)}${c.nextVisitTime ? ` ${c.nextVisitTime}` : ""}`;
}

// 生年月日から満年齢を計算 (基準: TODAY)
export function ageFromBirthday(birthday?: string): number | null {
  if (!birthday) return null;
  const b = parseISO(birthday);
  const t = parseISO(TODAY);
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

// 年齢から年代ラベル
export function ageBand(age: number | null): string | null {
  if (age === null) return null;
  if (age < 20) return "10代";
  if (age >= 50) return "50代以上";
  return `${Math.floor(age / 10) * 10}代`;
}

// ---- 来店履歴 ----
export interface VisitRecord {
  id: string;
  date: string;
  menus: string;
  staffId: string;
  staffName: string;
  amount: number;
  nominated: boolean;
  payment: string;
}

export function visitHistory(c: Customer): VisitRecord[] {
  const rnd = seeded(c.id + "visit");
  const n = Math.min(c.visitCount, 8);
  const records: VisitRecord[] = [];
  let d = parseISO(c.lastVisitDate);
  for (let i = 0; i < n; i++) {
    const main = MENUS[Math.floor(rnd() * MENUS.length)];
    const withSub = rnd() < 0.35;
    const sub = MENUS[Math.floor(rnd() * MENUS.length)];
    const menus = withSub && sub.id !== main.id ? `${main.name} + ${sub.name}` : main.name;
    const amount = main.price + (withSub && sub.id !== main.id ? sub.price : 0);
    // 最新の来店は前回担当、それ以外は主担当寄りで自然に
    const staff = i === 0 ? STAFF.find((s) => s.id === c.lastStaffId) ?? STAFF[0] : STAFF.find((s) => s.id === c.mainStaffId) ?? STAFF[0];
    records.push({
      id: `${c.id}-v${i}`,
      date: fmtISO(d),
      menus,
      staffId: staff.id,
      staffName: staff.name,
      amount,
      nominated: rnd() < 0.5,
      payment: rnd() < 0.55 ? "クレジット" : rnd() < 0.5 ? "現金" : "回数券消化",
    });
    d = addDays(d, -(16 + Math.floor(rnd() * 26)));
  }
  return records;
}

// ---- 会計サマリ ----
export function accountingSummary(c: Customer) {
  const visits = visitHistory(c);
  const avg = c.visitCount ? Math.round(c.ltv / c.visitCount) : 0;
  return { ltv: c.ltv, visitCount: c.visitCount, avgSpend: avg, recent: visits.slice(0, 5) };
}

// ---- 回数券履歴 ----
export interface TicketEvent {
  date: string;
  type: "購入" | "消化";
  detail: string;
}
export function ticketHistory(c: Customer): TicketEvent[] {
  if (c.tickets.length === 0) return [];
  const rnd = seeded(c.id + "ticket");
  const events: TicketEvent[] = [];
  let d = parseISO(c.lastVisitDate);
  for (const t of c.tickets) {
    const used = Math.max(1, Math.floor(rnd() * 3));
    for (let i = 0; i < used; i++) {
      events.push({ date: fmtISO(d), type: "消化", detail: `${t.name}（残${t.remaining + used - i}→${t.remaining + used - i - 1}）` });
      d = addDays(d, -(20 + Math.floor(rnd() * 20)));
    }
    events.push({ date: fmtISO(d), type: "購入", detail: `${t.name} を購入` });
    d = addDays(d, -(10 + Math.floor(rnd() * 20)));
  }
  return events;
}

// ---- LINE ----
export interface ChatMessage {
  id: string;
  from: "customer" | "store" | "auto";
  text: string;
  at: string;
}
export function chatMessages(c: Customer): ChatMessage[] {
  const tag = c.messageTags[0] ?? "ご来店";
  return [
    { id: "1", from: "store", text: `${c.name.split(" ")[0]}様、はじめまして！ご登録ありがとうございます🌿`, at: "5/12 10:02" },
    { id: "2", from: "auto", text: "［自動応答］初回カウンセリングフォームのご記入をお願いします → https://lin.ee/form", at: "5/12 10:02" },
    { id: "3", from: "customer", text: "記入しました！", at: "5/12 12:30" },
    { id: "4", from: "store", text: `ありがとうございます。${tag}のお悩みに合わせてご提案しますね。`, at: "5/12 13:10" },
    { id: "5", from: "customer", text: "次回の予約をお願いしたいです", at: "5/24 19:40" },
    { id: "6", from: "store", text: "かしこまりました。候補日をお送りします📅", at: "5/24 20:05" },
  ];
}

export interface DeliveryItem {
  id: string;
  date: string;
  kind: "シナリオ" | "一斉配信" | "リマインド" | "自動応答";
  title: string;
  status: "送信済" | "開封" | "予約";
}
export function deliveries(c: Customer): DeliveryItem[] {
  const items: DeliveryItem[] = [
    { id: "d1", date: "5/12", kind: "シナリオ", title: "初回フォロー①（来店お礼）", status: "開封" },
    { id: "d2", date: "5/14", kind: "シナリオ", title: "初回フォロー②（おすすめメニュー）", status: "開封" },
    { id: "d3", date: "5/20", kind: "一斉配信", title: "5月限定 ヘッドスパ20%OFF", status: "送信済" },
    { id: "d4", date: "5/26", kind: "自動応答", title: "予約完了 自動返信", status: "送信済" },
  ];
  if (c.nextVisitDate) {
    items.push({ id: "d5", date: jpDate(c.nextVisitDate), kind: "リマインド", title: "前日リマインド（来店確認）", status: "予約" });
  } else {
    items.push({ id: "d5", date: "6/05", kind: "リマインド", title: "再来促進（離反防止）", status: "予約" });
  }
  return items;
}

// ---- 回答フォーム ----
export interface FormAnswer {
  form: string;
  date: string;
  qa: { q: string; a: string }[];
}
export function formAnswers(c: Customer): FormAnswer[] {
  return [
    {
      form: "初回カウンセリングフォーム",
      date: "5/12",
      qa: [
        { q: "ご来店のきっかけ", a: c.firstSource },
        { q: "お悩み", a: c.messageTags.filter((t) => !/\d/.test(t)).slice(0, 2).join("・") || "特になし" },
        { q: "ご希望メニュー", a: c.funnel.split("→").slice(-1)[0]?.trim() ?? "おまかせ" },
        { q: "ご年代", a: c.messageTags.find((t) => t.includes("代")) ?? "—" },
      ],
    },
  ];
}

// ---- AI戦略 ----
export interface AIStrategy {
  churnRisk: "低" | "中" | "高";
  daysSinceLast: number;
  nextBestAction: string;
  suggestions: string[];
}
export function aiStrategy(c: Customer): AIStrategy {
  const days = daysBetween(c.lastVisitDate, TODAY);
  const churnRisk = days > 60 ? "高" : days > 30 ? "中" : "低";
  const suggestions: string[] = [];
  if (!c.monthlyMember.active) suggestions.push("月額会員プランの案内（継続率+18%見込み）");
  if (c.tickets.some((t) => t.remaining <= 1)) suggestions.push("回数券の追加購入を提案（残り僅か）");
  if (!c.lineLinked) suggestions.push("LINE未連携 → 連携クーポンで友だち追加を促進");
  if (days > 30) suggestions.push("再来促進クーポンをセグメント配信");
  suggestions.push(`${c.messageTags[0] ?? "おすすめ"}向けの新メニューを次回提案`);
  const nextBestAction = churnRisk === "高"
    ? "離反防止：限定オファー付きリマインドを今週配信"
    : c.nextVisitDate
    ? "来店前日リマインドで取りこぼし防止"
    : "次回予約の打診メッセージを送付";
  return { churnRisk, daysSinceLast: days, nextBestAction, suggestions };
}

// ---- 媒体ベンチマーク（分析タブ用・店舗集計のモック） ----
export interface MediaStat {
  media: string;
  registrations: number;
  visitRate: number;
  ticketRate: number;
  ltv: number;
}
export const MEDIA_STATS: MediaStat[] = [
  { media: "Instagram", registrations: 184, visitRate: 0.62, ticketRate: 0.28, ltv: 72000 },
  { media: "Meta広告", registrations: 142, visitRate: 0.55, ticketRate: 0.31, ltv: 81000 },
  { media: "Google", registrations: 96, visitRate: 0.48, ticketRate: 0.22, ltv: 64000 },
  { media: "ホットペッパー", registrations: 210, visitRate: 0.51, ticketRate: 0.18, ltv: 58000 },
  { media: "紹介", registrations: 64, visitRate: 0.78, ticketRate: 0.42, ltv: 120000 },
  { media: "公式LINE", registrations: 132, visitRate: 0.66, ticketRate: 0.3, ltv: 76000 },
  { media: "店頭", registrations: 58, visitRate: 0.7, ticketRate: 0.2, ltv: 52000 },
];
export const mediaStat = (media: string) => MEDIA_STATS.find((m) => m.media === media);

// 顧客の流入ファネル（媒体→フォーム→メッセージ→施術/回数券/会員）
export function funnelSteps(c: Customer): string[] {
  return c.funnel.split("→").map((s) => s.trim()).filter(Boolean);
}

// クロス分析サンプル（分析タブ / 将来の分析ページ用）
export const CROSS_ANALYSIS = [
  { label: "Meta広告 × 女性 × 肩こり", metric: "回数券購入率", value: "38%" },
  { label: "Instagram × 初回フェイシャル", metric: "平均LTV", value: "¥76,000" },
  { label: "紹介 × スタッフA", metric: "リピート率", value: "82%" },
];

// ---- メニュー利用履歴（前回利用日・利用回数・前回担当） ----
// 予約画面で「前回利用：YYYY/MM/DD」などをメニュー横に出すための集計。
export interface MenuUsage {
  lastDate: string;
  count: number;
  lastStaffId?: string;
}

// 「カット + カラー」のような表示名から menuId 配列を逆引き
function menuIdsFromLabel(label: string): string[] {
  return label
    .split("+")
    .map((s) => s.trim())
    .map((n) => MENUS.find((m) => m.name === n)?.id)
    .filter((x): x is string => !!x);
}

export function menuUsageMap(c: Customer): Record<string, MenuUsage> {
  const out: Record<string, MenuUsage> = {};
  for (const v of visitHistory(c)) {
    for (const id of menuIdsFromLabel(v.menus)) {
      const cur = out[id];
      if (!cur || v.date > cur.lastDate) {
        out[id] = { lastDate: v.date, count: (cur?.count ?? 0) + 1, lastStaffId: v.staffId };
      } else {
        out[id] = { ...cur, count: cur.count + 1 };
      }
    }
  }
  return out;
}

// 「前回と同じ内容で予約」用の最終来店要約（メニューID配列＋担当）
export interface LastVisitSummary {
  date: string;
  menuIds: string[];
  staffId: string;
  staffName: string;
}
export function lastVisitSummary(c: Customer): LastVisitSummary | null {
  const vs = visitHistory(c);
  if (vs.length === 0) return null;
  const v = vs[0];
  const ids = menuIdsFromLabel(v.menus);
  if (ids.length === 0) return null;
  return { date: v.date, menuIds: ids, staffId: v.staffId, staffName: v.staffName };
}

// 顧客が保有する回数券で消化できるメニュー（名称マッチ・残数>0）
export function ticketUsableMenuIds(c: Customer): { ticketId: string; menuIds: string[] }[] {
  const out: { ticketId: string; menuIds: string[] }[] = [];
  for (const t of c.tickets) {
    if (t.remaining <= 0) continue;
    const ids = MENUS.filter((m) => t.menus.includes(m.name) || m.name.includes(t.menus)).map((m) => m.id);
    if (ids.length) out.push({ ticketId: t.id, menuIds: ids });
  }
  return out;
}
