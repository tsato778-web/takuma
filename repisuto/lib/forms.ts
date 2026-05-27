// フォーム/テンプレートのデータ設計(将来の本実装を見据えた構造)。
// 個人情報入力テンプレート・回答フォーム(問診/アンケート)で共通利用する。

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "number"
  | "image"
  | "consent";

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: "テキスト",
  textarea: "長文",
  select: "プルダウン",
  radio: "ラジオ",
  checkbox: "チェックボックス",
  date: "日付",
  number: "数値",
  image: "画像アップロード",
  consent: "同意チェック",
};

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
  purpose: "初回問診" | "定期アンケート" | "来店後アンケート";
  fields: number;
  responses: number;
  status: "公開中" | "下書き";
  linkedToLine: boolean;
}

export const FORMS: SurveyForm[] = [
  { id: "form_intake", name: "初回カウンセリングフォーム", purpose: "初回問診", fields: 8, responses: 142, status: "公開中", linkedToLine: true },
  { id: "form_after", name: "来店後アンケート（翌日配信）", purpose: "来店後アンケート", fields: 5, responses: 86, status: "公開中", linkedToLine: true },
  { id: "form_survey", name: "定期満足度アンケート", purpose: "定期アンケート", fields: 6, responses: 39, status: "下書き", linkedToLine: false },
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
