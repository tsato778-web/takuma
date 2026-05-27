// 施術カルテのモックデータ。来店履歴と日付・担当を揃えて生成する。

import { CUSTOMERS, staffById, type Customer } from "./mock-data";
import { visitHistory, daysBetween, TODAY } from "./customer-data";

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
  counseling: string; // カウンセリング・主訴
  treatment: string; // 施術内容
  productsUsed: string; // 使用薬剤・設定
  finish: string; // 仕上がり・所感
  homecare: string; // ホームケア
  nextProposal: string; // 次回提案
  caution: string; // 注意事項
  hasPhotos: boolean;
}

export const CHART_FIELDS: { key: keyof ChartRecord; label: string }[] = [
  { key: "counseling", label: "カウンセリング・主訴" },
  { key: "treatment", label: "施術内容" },
  { key: "productsUsed", label: "使用薬剤・設定" },
  { key: "finish", label: "仕上がり・所感" },
  { key: "homecare", label: "ホームケア" },
  { key: "nextProposal", label: "次回提案" },
  { key: "caution", label: "注意事項" },
];

export const CHART_STATUS_STYLE: Record<ChartStatus, string> = {
  記入済: "bg-emerald-100 text-emerald-700",
  下書き: "bg-amber-100 text-amber-700",
  未記入: "bg-rose-100 text-rose-700",
};

function mainMenu(menus: string): string {
  return menus.split("+")[0].trim();
}

function detailByMenu(menu: string, c: Customer): Omit<ChartRecord, "id" | "customerId" | "customerName" | "date" | "staffId" | "staffName" | "menus" | "status" | "hasPhotos"> {
  const sensitive = c.tags.includes("敏感肌");
  const caution = sensitive ? "敏感肌：パッチテスト実施・低刺激処方で対応" : "特記事項なし";
  const concern = c.messageTags.find((t) => !/代$/.test(t) && t !== "VIP" && t !== "新規") ?? "ご要望";
  const counseling = `「${concern}」を中心にヒアリング。前回からの変化を確認し希望を共有。`;
  switch (menu) {
    case "カラー":
      return { counseling, treatment: "根元リタッチ＋全体カラー", productsUsed: "アッシュ8 / オキシ3% / 放置20分", finish: "ムラなく発色。希望トーンに調整済み", homecare: "カラーシャンプーで色持ちキープ", nextProposal: "4〜5週でリタッチ推奨", caution };
    case "カット":
      return { counseling, treatment: "レイヤーカット＋顔まわり調整", productsUsed: "—（スタイリング：軽めワックス）", finish: "扱いやすい長さに。再現性◎", homecare: "オイルで毛先の保湿を", nextProposal: "1.5〜2ヶ月でメンテカット", caution };
    case "パーマ":
      return { counseling, treatment: "コスメパーマ（ロッド中）", productsUsed: "1液5分→2液5分 / 中間水洗あり", finish: "柔らかいウェーブ。ダメージ少なめ", homecare: "ムース乾燥でウェーブ復元", nextProposal: "2〜3ヶ月でかけ直し", caution };
    case "ヘッドスパ":
      return { counseling, treatment: "スカルプクレンジング＋マッサージ30分", productsUsed: "スカルプ用クレンジング / 頭皮用美容液", finish: "頭皮スッキリ・血行良好", homecare: "頭皮用ローションで保湿", nextProposal: "月1回の定期スパ", caution };
    case "フェイシャル":
      return { counseling, treatment: "クレンジング＋イオン導入＋鎮静パック", productsUsed: "ビタミンC導入 / 鎮静ジェル", finish: "肌トーンUP・キメ改善", homecare: "保湿と日中のUVケア徹底", nextProposal: "3〜4週で継続施術（回数券推奨）", caution };
    case "トリートメント":
      return { counseling, treatment: "システムトリートメント3STEP", productsUsed: "CMC補修＋ヘマチン", finish: "指通りなめらか・艶感UP", homecare: "週2回の集中トリートメント", nextProposal: "毎回の施術に追加がおすすめ", caution };
    default:
      return { counseling, treatment: `${menu}を実施`, productsUsed: "—", finish: "良好", homecare: "—", nextProposal: "次回も継続", caution };
  }
}

export function chartsForCustomer(c: Customer): ChartRecord[] {
  return visitHistory(c).map((v, i) => {
    const d = daysBetween(v.date, TODAY);
    const status: ChartStatus = i > 0 ? "記入済" : d <= 1 ? "未記入" : d <= 10 ? "下書き" : "記入済";
    const detail = detailByMenu(mainMenu(v.menus), c);
    const blank = status === "未記入";
    return {
      id: `chart-${v.id}`,
      customerId: c.id,
      customerName: c.name,
      date: v.date,
      staffId: v.staffId,
      staffName: v.staffName,
      menus: v.menus,
      status,
      hasPhotos: !blank && i % 2 === 0,
      counseling: blank ? "" : detail.counseling,
      treatment: blank ? "" : detail.treatment,
      productsUsed: blank ? "" : detail.productsUsed,
      finish: status === "記入済" ? detail.finish : "",
      homecare: status === "記入済" ? detail.homecare : "",
      nextProposal: status === "記入済" ? detail.nextProposal : "",
      caution: blank ? "" : detail.caution,
    };
  });
}

export function allCharts(): ChartRecord[] {
  return CUSTOMERS.flatMap((c) => chartsForCustomer(c)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export const staffName = (id: string) => staffById(id)?.name ?? "—";
