// Vercel Serverless Function: /api/kpi?academy=tech|mgmt
//
// 現時点ではモックデータを返します。
// UTAGE API が繋がったら fetchFromUtage() の中身を差し替えるだけで
// フロントエンドは変更不要です。
//
// 使用する環境変数（Vercel Dashboard → Settings → Environment Variables）
//   UTAGE_API_KEY  ... UTAGEの管理画面で発行したAPIキー
//   UTAGE_API_BASE ... （任意）UTAGEのAPIベースURL

const MOCK = {
  tech: {
    name: "技術アカデミー",
    heading: "技術アカデミー ダッシュボード",
    stats: {
      members:    { v: "1,284", d: "▲ 8.4% 先月比",  cls: "delta-up" },
      courses:    { v: "42",    d: "▲ 3 今月新設",    cls: "delta-up" },
      completion: { v: "87.2%", d: "▲ 2.1pt 前期比",  cls: "delta-up" },
      revenue:    { v: "¥18.2M", d: "▼ 1.3% 前月比",  cls: "delta-down" },
    },
    enrollTrend: [62, 78, 85, 92, 108, 124, 132, 118, 140, 156, 168, 184],
    cohort: {
      freeN: 412, paidN: 287,
      retention: { free: [95, 52, 43], paid: [88, 78, 71] },
      churn:     { free: [5, 48, 57],  paid: [12, 22, 29] },
      note: {
        retention: "💡 <strong>インサイト：</strong>初月無料コホートは2ヶ月後（有料移行時）に継続率が95%→52%へ大幅に低下。一方、初月から有料プランは88%→78%と離脱が緩やか。有料移行の障壁を下げる施策（進捗リマインド・割引・チュートリアル強化）が有効と推定されます。",
        churn: "⚠️ <strong>注意点：</strong>初月無料プランの2ヶ月後退会率は48%と高水準。有料移行前の接点設計（進捗リマインド・1on1メンタリング案内等）で退会の山を低減する余地があります。初月有料コホートは累計退会率29%で、3ヶ月経過時点の定着率は良好です。",
      },
    },
    courses: [
      { code: "JS", color: "#2563eb", title: "モダンJavaScript マスター", meta: "全12回・受講生 212名・山田 太郎",  progress: 78 },
      { code: "AI", color: "#10b981", title: "AI・機械学習入門",           meta: "全10回・受講生 185名・田中 花子",  progress: 65 },
      { code: "PY", color: "#f59e0b", title: "Python データ分析 実践",     meta: "全8回・受講生 147名・鈴木 健太",   progress: 92 },
      { code: "CL", color: "#8b5cf6", title: "クラウドインフラ AWS編",     meta: "全6回・受講生 98名・高橋 次郎",    progress: 45 },
      { code: "SC", color: "#ef4444", title: "セキュリティ実務講座",       meta: "全5回・受講生 64名・伊藤 久美子",  progress: 30 },
    ],
    schedule: [
      { d: "24", m: "APR", title: "React 実践ワークショップ", meta: "14:00 - 17:00・オンライン・山田講師" },
      { d: "25", m: "APR", title: "AI基礎 特別講義",          meta: "10:00 - 12:00・渋谷校舎・田中講師" },
      { d: "27", m: "APR", title: "期末プロジェクト発表会",   meta: "13:00 - 18:00・ハイブリッド" },
      { d: "29", m: "APR", title: "講師ミーティング",          meta: "18:00 - 19:00・オンライン" },
    ],
  },
  mgmt: {
    name: "経営アカデミー",
    heading: "経営アカデミー ダッシュボード",
    stats: {
      members:    { v: "682",   d: "▲ 12.1% 先月比", cls: "delta-up" },
      courses:    { v: "18",    d: "▲ 2 今月新設",   cls: "delta-up" },
      completion: { v: "91.4%", d: "▲ 3.4pt 前期比", cls: "delta-up" },
      revenue:    { v: "¥9.8M", d: "▲ 5.2% 前月比",  cls: "delta-up" },
    },
    enrollTrend: [24, 28, 35, 42, 48, 54, 62, 68, 74, 82, 89, 98],
    cohort: {
      freeN: 218, paidN: 164,
      retention: { free: [92, 68, 58], paid: [91, 84, 78] },
      churn:     { free: [8, 32, 42],  paid: [9, 16, 22] },
      note: {
        retention: "💡 <strong>インサイト：</strong>経営アカデミーは初月無料・有料ともに3ヶ月継続率が高水準で、学習意欲の高い層が中心と推測されます。初月無料→2ヶ月後68%、初月有料→2ヶ月後84%と有料コホートが特に安定。コミュニティ活性化で差をさらに広げられる可能性があります。",
        churn: "⚠️ <strong>注意点：</strong>初月無料プランの累計退会率は3ヶ月時点で42%。2ヶ月目（有料移行）での離脱が32%と相応にあります。初月有料は3ヶ月時点で22%と低く、早期に課金意思を持つ層の定着が良好です。",
      },
    },
    courses: [
      { code: "MK", color: "#ec4899", title: "B2B マーケティング戦略",       meta: "全10回・受講生 124名・小林 真理", progress: 82 },
      { code: "FN", color: "#14b8a6", title: "財務分析と KPI 設計",          meta: "全8回・受講生 98名・中村 誠",     progress: 74 },
      { code: "HR", color: "#8b5cf6", title: "組織開発・1on1 マネジメント",  meta: "全6回・受講生 86名・佐々木 由美", progress: 68 },
      { code: "ST", color: "#2563eb", title: "事業戦略ワークショップ",       meta: "全5回・受講生 72名・大野 雄介",   progress: 58 },
      { code: "LD", color: "#f59e0b", title: "リーダーシップ基礎",           meta: "全4回・受講生 54名・吉田 陽子",   progress: 42 },
    ],
    schedule: [
      { d: "24", m: "APR", title: "経営者オンライン座談会", meta: "20:00 - 21:30・オンライン・小林講師" },
      { d: "26", m: "APR", title: "財務分析 実践ワーク",    meta: "14:00 - 17:00・オンライン・中村講師" },
      { d: "28", m: "APR", title: "事業戦略ピッチ大会",     meta: "13:00 - 18:00・ハイブリッド" },
      { d: "30", m: "APR", title: "メンター全体会",          meta: "19:00 - 20:00・オンライン" },
    ],
  },
};

// UTAGEが繋がったら、この関数の中身を実装する
// async function fetchFromUtage(academy) {
//   const key = process.env.UTAGE_API_KEY;
//   const base = process.env.UTAGE_API_BASE;
//   const productId = academy === "tech" ? "xxx" : "yyy";
//
//   const res = await fetch(`${base}/members?product_id=${productId}`, {
//     headers: { Authorization: `Bearer ${key}` },
//   });
//   const raw = await res.json();
//   return transformToDashboardShape(raw);
// }

export default async function handler(req, res) {
  const academy = (req.query.academy || "tech").toString();

  if (!MOCK[academy]) {
    return res.status(404).json({ error: "unknown academy", academy });
  }

  // TODO: UTAGE_API_KEY が設定されたら fetchFromUtage() に切り替える
  // if (process.env.UTAGE_API_KEY) {
  //   const data = await fetchFromUtage(academy);
  //   return res.status(200).json({ ...data, _source: "utage" });
  // }

  // CDNキャッシュ（60秒）でUTAGEへの過剰アクセスを防ぐ
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    ...MOCK[academy],
    _source: "mock",
    _hasApiKey: Boolean(process.env.UTAGE_API_KEY),
  });
}
