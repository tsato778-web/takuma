/** サイドメニュー（要件22）。Phase 1 未実装の画面は phase で示す。 */

export type NavItem = {
  href: string;
  label: string;
  /** 2 = Phase 2 以降に実装予定（画面上でグレー表示） */
  phase?: 2 | 3;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "採用管理",
    items: [
      { href: "/candidates", label: "候補者一覧" },
      { href: "/pipeline", label: "選考進捗" },
      { href: "/matching", label: "エリアマッチング" },
      { href: "/offers", label: "内定・入社管理" },
    ],
  },
  {
    title: "LINE",
    items: [
      { href: "/chat", label: "1対1トーク" },
      { href: "/scenarios", label: "シナリオ配信", phase: 2 },
      { href: "/broadcasts", label: "一斉配信", phase: 2 },
      { href: "/templates", label: "テンプレート" },
      { href: "/forms", label: "回答フォーム" },
      { href: "/reminders", label: "リマインド配信", phase: 2 },
    ],
  },
  {
    title: "候補者属性",
    items: [
      { href: "/tags", label: "タグ管理" },
      { href: "/friends", label: "友だち情報" },
      { href: "/search", label: "検索" },
    ],
  },
  {
    title: "コンテンツ",
    items: [
      { href: "/media", label: "登録メディア" },
      { href: "/rich-menus", label: "リッチメニュー" },
    ],
  },
  {
    title: "分析",
    items: [
      { href: "/", label: "採用ダッシュボード" },
      { href: "/analytics/funnel", label: "採用ファネル" },
      { href: "/analytics/sources", label: "流入分析", phase: 3 },
      { href: "/analytics/post-hire", label: "入社後分析", phase: 3 },
    ],
  },
  {
    title: "設定",
    items: [
      { href: "/settings/line", label: "LINE公式アカウント設定" },
      { href: "/settings/pipeline", label: "採用フロー設定" },
      { href: "/settings/areas", label: "エリア・店舗マスタ" },
      { href: "/settings/users", label: "担当者マスタ" },
      { href: "/settings/import", label: "CSVインポート" },
    ],
  },
];
