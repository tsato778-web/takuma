// フォーム/テンプレートのデータ設計(将来の本実装を見据えた構造)。
// 個人情報入力テンプレート・回答フォーム(問診/アンケート)で共通利用する。

export type FieldType =
  | "subheading"
  | "heading"
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "number"
  | "prefecture"
  | "file"
  | "image"
  | "consent";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  subheading: "小見出し",
  heading: "中見出し（セクション）",
  text: "テキスト",
  textarea: "長文",
  select: "プルダウン",
  radio: "ラジオ",
  checkbox: "チェックボックス",
  date: "日付",
  number: "数値",
  prefecture: "都道府県",
  file: "ファイル添付",
  image: "画像アップロード",
  consent: "同意チェック",
};

// 見出し系は入力欄を持たない（セクション区切り）
export const isHeading = (t: FieldType) => t === "heading" || t === "subheading";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // select/radio/checkbox
  mapTo?: string; // 顧客項目への紐付け(name/phone/birthday 等)
  tagOnAnswer?: boolean; // 回答をタグ化するか
}

export interface FormTemplate {
  id: string;
  name: string;
  category: string;
  fields: FormField[];
}

const f = (id: string, label: string, type: FieldType, required = false, extra: Partial<FormField> = {}): FormField => ({ id, label, type, required, ...extra });

// 個人情報入力テンプレートのベース(業種別に展開)
export const BASE_INTAKE: FormTemplate[] = [
  {
    id: "tpl_seitai",
    name: "整体用テンプレート",
    category: "整体",
    fields: [
      f("name", "氏名", "text", true, { mapTo: "name" }),
      f("kana", "カナ", "text", true, { mapTo: "kana" }),
      f("phone", "電話番号", "text", true, { mapTo: "phone" }),
      f("birthday", "生年月日", "date", false, { mapTo: "birthday" }),
      f("gender", "性別", "radio", true, { options: ["女性", "男性"], mapTo: "gender" }),
      f("symptom", "お悩み（部位）", "checkbox", true, { options: ["肩こり", "腰痛", "頭痛", "膝痛"], tagOnAnswer: true }),
      f("history", "既往歴", "textarea"),
      f("consent_cancel", "当日キャンセルは100%のキャンセル料を請求いたします", "consent", true),
    ],
  },
  {
    id: "tpl_beauty",
    name: "美容整体用テンプレート",
    category: "美容整体",
    fields: [
      f("name", "氏名", "text", true, { mapTo: "name" }),
      f("phone", "電話番号", "text", true, { mapTo: "phone" }),
      f("motivation", "来店動機", "select", true, { options: ["小顔", "姿勢改善", "むくみ", "リフトアップ"], tagOnAnswer: true }),
      f("concern", "気になる部位", "checkbox", false, { options: ["顔", "首", "肩", "背中"], tagOnAnswer: true }),
      f("consent_privacy", "個人情報の取り扱いに同意する", "consent", true),
    ],
  },
  {
    id: "tpl_este",
    name: "エステ用テンプレート",
    category: "エステ",
    fields: [
      f("name", "氏名", "text", true, { mapTo: "name" }),
      f("phone", "電話番号", "text", true, { mapTo: "phone" }),
      f("skin", "肌悩み", "checkbox", true, { options: ["乾燥", "毛穴", "くすみ", "ハリ不足"], tagOnAnswer: true }),
      f("allergy", "アレルギー・禁忌", "textarea"),
      f("consent_privacy", "個人情報の取り扱いに同意する", "consent", true),
    ],
  },
];

// 回答フォーム(問診/アンケート)
export interface SurveyForm {
  id: string;
  name: string;
  purpose: string;
  folder: string;
  fields: number;
  responses: number;
  status: "公開中" | "下書き";
  linkedToLine: boolean;
  createdAt: string;
  updatedAt: string;
}

export const FORM_FOLDERS = ["すべて", "初回問診", "アンケート", "同意書", "キャンペーン", "未分類"];

export const FORMS: SurveyForm[] = [
  { id: "form_intake", name: "初回カウンセリングフォーム", purpose: "初回問診", folder: "初回問診", fields: 8, responses: 142, status: "公開中", linkedToLine: true, createdAt: "2026/03/02", updatedAt: "2026/05/20" },
  { id: "form_consent", name: "施術同意書（敏感肌・既往歴）", purpose: "同意書", folder: "同意書", fields: 4, responses: 118, status: "公開中", linkedToLine: false, createdAt: "2026/03/02", updatedAt: "2026/04/11" },
  { id: "form_after", name: "来店後アンケート（翌日配信）", purpose: "来店後アンケート", folder: "アンケート", fields: 5, responses: 86, status: "公開中", linkedToLine: true, createdAt: "2026/03/15", updatedAt: "2026/05/18" },
  { id: "form_review", name: "口コミ依頼前アンケート", purpose: "来店後アンケート", folder: "アンケート", fields: 3, responses: 54, status: "公開中", linkedToLine: true, createdAt: "2026/04/01", updatedAt: "2026/05/10" },
  { id: "form_survey", name: "定期満足度アンケート", purpose: "定期アンケート", folder: "アンケート", fields: 6, responses: 39, status: "下書き", linkedToLine: false, createdAt: "2026/04/20", updatedAt: "2026/05/02" },
  { id: "form_campaign", name: "春の紹介キャンペーン応募", purpose: "キャンペーン", folder: "キャンペーン", fields: 5, responses: 73, status: "公開中", linkedToLine: true, createdAt: "2026/03/28", updatedAt: "2026/04/30" },
];

export const AFTER_SURVEY: FormField[] = [
  f("satisfaction", "総合満足度", "radio", true, { options: ["大変満足", "満足", "普通", "不満"], tagOnAnswer: true }),
  f("service", "接客評価", "radio", true, { options: ["5", "4", "3", "2", "1"] }),
  f("treatment", "施術評価", "radio", true, { options: ["5", "4", "3", "2", "1"] }),
  f("improve", "改善してほしい点", "textarea"),
  f("review_ok", "Google口コミにご協力いただけますか", "consent", false, { tagOnAnswer: true }),
];

export interface FormResponse {
  id: string;
  form: string;
  customer: string;
  date: string;
  summary: string;
  tags: string[];
}
export const RESPONSES: FormResponse[] = [
  { id: "r1", form: "初回カウンセリングフォーム", customer: "伊藤 さくら", date: "5/27", summary: "肩こり・20代・Meta広告", tags: ["肩こり", "新規"] },
  { id: "r2", form: "来店後アンケート（翌日配信）", customer: "加藤 結衣", date: "5/19", summary: "総合満足度：大変満足 / 口コミ協力OK", tags: ["満足度高", "口コミ依頼可"] },
  { id: "r3", form: "初回カウンセリングフォーム", customer: "渡辺 あおい", date: "5/05", summary: "敏感肌・乾燥・Instagram", tags: ["敏感肌"] },
];
