// 施術カルテのモックデータ。
// 2系統に分離:
//  - お客様入力カルテ(初回問診): 顧客1人につき1件。将来フォームビルダー化前提で
//    「セクション×フィールド(型/必須)」の配列構造で保持。
//  - スタッフ入力カルテ: 来院ごとに蓄積。SOAP形式 + 会計/回数券/次回予約。

import { CUSTOMERS, staffById, type Customer } from "./mock-data";
import { visitHistory, daysBetween, TODAY, ageFromBirthday } from "./customer-data";

export type ChartStatus = "記入済" | "下書き" | "未記入";

export interface ChartRecord {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  staffId: string;
  staffName: string;
  menus: string;
  status: ChartStatus;
  // SOAP
  soapS: string; // 主観情報
  soapO: string; // 客観情報
  soapA: string; // 評価
  soapP: string; // 計画
  treatment: string; // 施術内容
  productsUsed: string; // 使用薬剤・設定
  memo: string; // 施術メモ
  nextProposal: string; // 次回提案
  caution: string; // 注意事項
  amount: number; // 会計
  payment: string;
  ticketUsed: boolean; // 回数券消化
  hasNextReservation: boolean; // 次回予約
  hasPhotos: boolean;
}

export const CHART_STATUS_STYLE: Record<ChartStatus, string> = {
  記入済: "bg-emerald-100 text-emerald-700",
  下書き: "bg-amber-100 text-amber-700",
  未記入: "bg-rose-100 text-rose-700",
};

export const SOAP_META: { key: "soapS" | "soapO" | "soapA" | "soapP"; tag: string; label: string; dot: string }[] = [
  { key: "soapS", tag: "S", label: "主観情報", dot: "bg-sky-500" },
  { key: "soapO", tag: "O", label: "客観情報", dot: "bg-violet-500" },
  { key: "soapA", tag: "A", label: "評価", dot: "bg-amber-500" },
  { key: "soapP", tag: "P", label: "計画", dot: "bg-emerald-500" },
];

function mainMenu(menus: string): string {
  return menus.split("+")[0].trim();
}

const HAIR = ["カット", "カラー", "パーマ", "トリートメント"];

function soapByMenu(menu: string, c: Customer) {
  const concern = c.messageTags.find((t) => !/代$/.test(t) && t !== "VIP" && t !== "新規") ?? "ご要望";
  const sensitive = c.tags.includes("敏感肌");
  if (menu === "フェイシャル") {
    return {
      soapS: `「${concern}」が気になる。乾燥とくすみが特に気になるとのこと。`,
      soapO: `肌状態: 水分量やや低下・キメ乱れ軽度。${sensitive ? "頬に赤みあり(敏感)。" : "炎症なし。"}`,
      soapA: "バリア機能低下傾向。保湿と鎮静で改善見込み。",
      soapP: "ビタミンC導入を継続。3〜4週ごとの施術＋ホームケア徹底。",
      treatment: "クレンジング＋イオン導入＋鎮静パック",
      productsUsed: "ビタミンC導入 / 鎮静ジェル",
      memo: sensitive ? "次回もパッチテストから。低刺激で。" : "導入強度は標準でOK。",
    };
  }
  if (menu === "ヘッドスパ") {
    return {
      soapS: `「${concern}」。頭皮の張り・疲れを感じる。`,
      soapO: "頭皮: やや硬め・血行不良ぎみ。フケ・赤みなし。",
      soapA: "緊張型のコリ。定期ケアで緩和が見込める。",
      soapP: "月1回の定期スパを提案。自宅でのマッサージ指導。",
      treatment: "スカルプクレンジング＋マッサージ30分",
      productsUsed: "スカルプ用クレンジング / 頭皮用美容液",
      memo: "炭酸スパの追加提案も検討。",
    };
  }
  // hair (cut/color/perm/treatment)
  return {
    soapS: `「${concern}」。${menu === "カラー" ? "白髪・色落ちが気になる。" : "扱いづらさ・まとまりが気になる。"}`,
    soapO: `毛髪: ダメージレベル中・乾燥ぎみ。${menu === "カラー" ? "既染部の褪色あり。" : ""}`,
    soapA: "ダメージ進行は軽度。継続ケアで改善見込み。",
    soapP: menu === "カラー" ? "4〜5週でリタッチ。次回トリートメント追加を提案。" : "1.5〜2ヶ月でメンテ。ホームケア継続。",
    treatment: menu === "カラー" ? "根元リタッチ＋全体カラー" : menu === "パーマ" ? "コスメパーマ(ロッド中)" : menu === "トリートメント" ? "システムトリートメント3STEP" : "レイヤーカット＋顔まわり調整",
    productsUsed: menu === "カラー" ? "アッシュ8 / オキシ3% / 放置20分" : menu === "パーマ" ? "1液5分→2液5分" : "—",
    memo: "次回はトーン・長さの希望を再確認。",
  };
}

export function chartsForCustomer(c: Customer): ChartRecord[] {
  return visitHistory(c).map((v, i) => {
    const d = daysBetween(v.date, TODAY);
    const status: ChartStatus = i > 0 ? "記入済" : d <= 1 ? "未記入" : d <= 10 ? "下書き" : "記入済";
    const s = soapByMenu(mainMenu(v.menus), c);
    const blank = status === "未記入";
    const caution = c.tags.includes("敏感肌") ? "敏感肌：パッチテスト実施・低刺激処方" : "特記事項なし";
    return {
      id: `chart-${v.id}`,
      customerId: c.id,
      customerName: c.name,
      date: v.date,
      staffId: v.staffId,
      staffName: v.staffName,
      menus: v.menus,
      status,
      soapS: blank ? "" : s.soapS,
      soapO: blank ? "" : s.soapO,
      soapA: status === "記入済" ? s.soapA : "",
      soapP: status === "記入済" ? s.soapP : "",
      treatment: blank ? "" : s.treatment,
      productsUsed: blank ? "" : s.productsUsed,
      memo: status === "記入済" ? s.memo : "",
      nextProposal: status === "記入済" ? s.soapP : "",
      caution: blank ? "" : caution,
      amount: v.amount,
      payment: v.payment,
      ticketUsed: v.payment === "回数券消化",
      hasNextReservation: i === 0 ? !!c.nextVisitDate : v.nominated,
      hasPhotos: !blank && i % 2 === 0,
    };
  });
}

export function allCharts(): ChartRecord[] {
  return CUSTOMERS.flatMap((c) => chartsForCustomer(c)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export const staffName = (id: string) => staffById(id)?.name ?? "—";

// ===== お客様入力カルテ(初回問診) =====
// フォームビルダー化前提: セクション×フィールド(型/必須)の構造で保持。
export type IntakeFieldType = "text" | "tel" | "date" | "textarea" | "select" | "checkbox";
export interface IntakeField {
  id: string;
  label: string;
  value: string;
  type: IntakeFieldType;
  required: boolean;
}
export interface IntakeSection {
  title: string;
  fields: IntakeField[];
}

const WARDS = ["渋谷区", "新宿区", "目黒区", "世田谷区", "港区", "中央区"];

function seededPick<T>(key: string, arr: T[]): T {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export function intakeSections(c: Customer): IntakeSection[] {
  const age = ageFromBirthday(c.birthday);
  const concerns = c.messageTags.filter((t) => !/代$/.test(t) && t !== "VIP" && t !== "新規");
  const sensitive = c.tags.includes("敏感肌");
  const ward = seededPick(c.id, WARDS);
  const f = (id: string, label: string, value: string, type: IntakeFieldType = "text", required = false): IntakeField => ({
    id,
    label,
    value,
    type,
    required,
  });
  return [
    {
      title: "基本情報",
      fields: [
        f("name", "氏名", c.name, "text", true),
        f("kana", "カナ", c.kana, "text", true),
        f("birthday", "生年月日", c.birthday ? `${c.birthday.replace(/-/g, "/")}${age !== null ? `（${age}歳）` : ""}` : "—", "date", true),
        f("gender", "性別", c.gender === "F" ? "女性" : "男性", "select", true),
        f("phone", "電話番号", c.phone, "tel", true),
        f("address", "住所", `東京都${ward}（番地以下はモック）`, "text"),
      ],
    },
    {
      title: "ご来店について",
      fields: [
        f("motivation", "来店動機", `${c.firstSource}を見て / ${concerns[0] ?? "悩み"}の改善希望`, "textarea", true),
        f("firstSource", "初回媒体", c.firstSource, "select", true),
        f("funnel", "流入経路", c.funnel, "text"),
      ],
    },
    {
      title: "カウンセリング",
      fields: [
        f("chief", "主訴", concerns[0] ? `${concerns[0]}を改善したい` : "特になし", "textarea", true),
        f("concerns", "悩み", concerns.join("・") || "特になし", "textarea"),
        f("history", "既往歴", sensitive ? "アトピー性皮膚炎（軽度）" : "特になし", "textarea"),
        f("contraindication", "禁忌事項", sensitive ? "特定成分にかぶれやすい" : "なし", "textarea"),
        f("lifestyle", "生活習慣", seededPick(c.id + "life", ["睡眠不足ぎみ・PC作業多め", "運動習慣あり・水分多め", "外回り多くUV曝露多め", "夜型・甘いもの好き"]), "textarea"),
      ],
    },
    {
      title: "同意事項",
      fields: [
        f("consent_terms", "施術内容・リスクへの同意", "同意済み（初回来店時）", "checkbox", true),
        f("consent_privacy", "個人情報の取り扱いへの同意", "同意済み（初回来店時）", "checkbox", true),
        f("consent_photo", "施術写真の記録・活用への同意", sensitive ? "未同意" : "同意済み", "checkbox"),
      ],
    },
  ];
}
