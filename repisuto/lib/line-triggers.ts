// LINE自動トリガー(配信エンジン)のモック。
// トリガールール × 顧客データ から「いつ・誰に・どの文面を送るか(配信予定キュー)」を算出する。
// 本実装では LINE Messaging API / スケジューラ / 配信ログに接続する想定。

import { CUSTOMERS, ticketRemainingTotal, staffById, type Customer } from "./mock-data";
import { daysBetween, jpDate, TODAY } from "./customer-data";

export type TriggerEvent =
  | "visit_done"
  | "next_day"
  | "after_3d"
  | "after_7d"
  | "before_visit"
  | "no_visit_30"
  | "no_visit_60"
  | "birthday"
  | "ticket_1"
  | "no_review";

export type Channel = "LINE" | "SMS" | "メール";

export interface TriggerRule {
  id: string;
  name: string;
  event: TriggerEvent;
  triggerLabel: string; // いつ
  condition: string; // 状態条件
  channel: Channel;
  template: string; // {name}{staff}{time}{recDate} を差し込み
  active: boolean;
  sent30d: number; // 直近30日の送信数(モック)
}

export const TRIGGER_RULES: TriggerRule[] = [
  { id: "thanks", name: "来店サンクス", event: "visit_done", triggerLabel: "来店直後", condition: "全来店者", channel: "LINE", template: "{name}様、本日はご来店ありがとうございました🌿 担当の{staff}です。お疲れさまでした！", active: true, sent30d: 142 },
  { id: "survey", name: "翌日アンケート", event: "next_day", triggerLabel: "来店翌日", condition: "全来店者", channel: "LINE", template: "{name}様、昨日はありがとうございました。30秒のアンケートにご協力ください→ https://lin.ee/survey", active: true, sent30d: 121 },
  { id: "follow3", name: "3日後フォロー", event: "after_3d", triggerLabel: "来店3日後", condition: "次回予約なし", channel: "LINE", template: "{name}様、その後の調子はいかがですか？気になる点があればいつでもご相談ください。", active: true, sent30d: 64 },
  { id: "follow7", name: "7日後 限定オファー", event: "after_7d", triggerLabel: "来店7日後", condition: "次回予約なし", channel: "LINE", template: "{name}様、次回ご予約で使える限定クーポンをお送りします。次回は{recDate}頃が目安です。", active: true, sent30d: 48 },
  { id: "reminder", name: "前日リマインド", event: "before_visit", triggerLabel: "来店前日", condition: "次回予約あり", channel: "LINE", template: "{name}様、明日{time}のご予約のリマインドです。担当は{staff}です。お気をつけてお越しください。", active: true, sent30d: 86 },
  { id: "ret30", name: "30日未来店フォロー", event: "no_visit_30", triggerLabel: "最終来店30日", condition: "30〜59日未来店", channel: "LINE", template: "{name}様、お久しぶりです。そろそろメンテナンスの時期です。{recDate}頃のご来店はいかがですか？", active: true, sent30d: 33 },
  { id: "ret60", name: "60日復帰キャンペーン", event: "no_visit_60", triggerLabel: "最終来店60日", condition: "60日以上未来店", channel: "LINE", template: "{name}様、また会えるのを楽しみにしています。復帰特典をご用意しました🎁", active: true, sent30d: 19 },
  { id: "bday", name: "誕生日クーポン", event: "birthday", triggerLabel: "誕生日", condition: "誕生日当日", channel: "LINE", template: "{name}様、お誕生日おめでとうございます🎂 バースデー特典をプレゼント！", active: true, sent30d: 12 },
  { id: "ticket1", name: "回数券 残1 更新案内", event: "ticket_1", triggerLabel: "回数券残1", condition: "回数券残1", channel: "LINE", template: "{name}様、回数券があと1回です。今なら更新で限定特典付き。担当{staff}より。", active: true, sent30d: 9 },
  { id: "review", name: "口コミ依頼", event: "no_review", triggerLabel: "来店翌日(高満足)", condition: "口コミ未・3回以上", channel: "LINE", template: "{name}様、よろしければGoogle口コミにご協力いただけませんか？ポイントを進呈します。", active: true, sent30d: 27 },
];

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function nextBirthday(bday?: string): string | null {
  if (!bday) return null;
  const [, mm, dd] = bday.split("-");
  const ty = Number(TODAY.slice(0, 4));
  const thisYear = `${ty}-${mm}-${dd}`;
  return thisYear >= TODAY ? thisYear : `${ty + 1}-${mm}-${dd}`;
}
const reviewed = (c: Customer) => c.tags.includes("Google口コミ済") || c.tags.includes("HPB口コミ済");

function personalize(tpl: string, c: Customer): string {
  const days = c.messageTags.includes("フェイシャル") || c.tags.includes("VIP") ? 28 : 35;
  return tpl
    .replace(/\{name\}/g, c.name.split(" ")[0])
    .replace(/\{staff\}/g, staffById(c.mainStaffId)?.name.split(" ")[0] ?? "担当")
    .replace(/\{time\}/g, c.nextVisitTime ?? "")
    .replace(/\{recDate\}/g, jpDate(addDaysISO(c.lastVisitDate, days)));
}

export interface ScheduledMessage {
  id: string;
  at: string; // YYYY-MM-DD
  overdue: boolean; // 送信予定が過去(=本日要送信)
  customerId: string;
  customerName: string;
  ruleId: string;
  ruleName: string;
  triggerLabel: string;
  channel: Channel;
  message: string;
}

const HORIZON = 45; // 何日先まで予定を出すか

// ルール適用→配信予定を算出
export function buildQueue(activeIds: Set<string>): ScheduledMessage[] {
  const out: ScheduledMessage[] = [];
  const horizonEnd = addDaysISO(TODAY, HORIZON);
  const push = (c: Customer, rule: TriggerRule, at: string) => {
    if (!activeIds.has(rule.id)) return;
    if (at > horizonEnd) return;
    const overdue = at < TODAY;
    out.push({
      id: `${c.id}-${rule.id}`,
      at: overdue ? TODAY : at,
      overdue,
      customerId: c.id,
      customerName: c.name,
      ruleId: rule.id,
      ruleName: rule.name,
      triggerLabel: rule.triggerLabel,
      channel: rule.channel,
      message: personalize(rule.template, c),
    });
  };
  const rule = (id: string) => TRIGGER_RULES.find((r) => r.id === id)!;

  for (const c of CUSTOMERS) {
    const days = daysBetween(c.lastVisitDate, TODAY);
    const hasNext = !!c.nextVisitDate;
    const ticket = ticketRemainingTotal(c);

    // 来店翌日アンケート / サンクス(来店当日)
    if (c.lastVisitDate === TODAY) push(c, rule("thanks"), TODAY);
    if (days <= 1) push(c, rule("survey"), addDaysISO(c.lastVisitDate, 1));
    // 次回予約なしの3日/7日後フォロー
    if (!hasNext) {
      push(c, rule("follow3"), addDaysISO(c.lastVisitDate, 3));
      push(c, rule("follow7"), addDaysISO(c.lastVisitDate, 7));
    }
    // 前日リマインド
    if (hasNext) push(c, rule("reminder"), addDaysISO(c.nextVisitDate!, -1));
    // 未来店フォロー(30/59・60+) ※重複しないよう範囲分け
    if (!hasNext && days < 60) push(c, rule("ret30"), addDaysISO(c.lastVisitDate, 30));
    if (!hasNext && days >= 30) push(c, rule("ret60"), addDaysISO(c.lastVisitDate, 60));
    // 回数券残1
    if (ticket === 1) push(c, rule("ticket1"), TODAY);
    // 口コミ未(3回以上)
    if (!reviewed(c) && c.visitCount >= 3) push(c, rule("review"), addDaysISO(c.lastVisitDate, 1));
    // 誕生日
    const bd = nextBirthday(c.birthday);
    if (bd) push(c, rule("bday"), bd);
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
