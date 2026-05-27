import * as React from "react";

import { PageShell, MasterTable, AddButton, Chip, MockBadge } from "./page-shell";
import { STORES } from "@/lib/mock-data";

const colorDot = (c: string) => <span className="inline-block h-3 w-3 rounded-full align-middle" style={{ background: c }} />;

// ===================== 基本マスター =====================
type MasterDef = { title: string; description: string; columns: string[]; rows: React.ReactNode[][] };

const MASTERS: Record<string, MasterDef> = {
  brands: {
    title: "ブランドマスター",
    description: "ブランド単位の設定。テンプレートや問診フォームをブランドで共通化できます。",
    columns: ["ブランド", "店舗数", "テーマカラー", "状態"],
    rows: [
      ["リピスト ビューティー", "3 店舗", colorDot("#0ea5b7"), <Chip key="a" tone="ok">有効</Chip>],
      ["リピスト クリニック", "1 店舗", colorDot("#7c6df2"), <Chip key="b" tone="ok">有効</Chip>],
    ],
  },
  stores: {
    title: "店舗マスター",
    description: "店舗ごとの営業時間・席数・所属スタッフを管理します。",
    columns: ["店舗", "エリア", "営業時間", "スタッフ"],
    rows: STORES.map((s, i) => [s.name, ["渋谷", "新宿", "銀座"][i] ?? "—", "10:00 - 20:00", `${4 - i}名`]),
  },
  "customer-tags": {
    title: "顧客タグマスター",
    description: "手動タグと、会計・口コミなどで自動付与されるタグを管理します。",
    columns: ["タグ", "区分", "付与数"],
    rows: [
      ["VIP", <Chip key="1">手動</Chip>, "12"],
      ["新規", <Chip key="2" tone="accent">自動</Chip>, "38"],
      ["敏感肌", <Chip key="3">手動</Chip>, "9"],
      ["Google口コミ済", <Chip key="4" tone="accent">自動（会計）</Chip>, "21"],
      ["HPB口コミ済", <Chip key="5" tone="accent">自動（会計）</Chip>, "14"],
      ["離反リスク", <Chip key="6" tone="warn">自動（CRM）</Chip>, "23"],
    ],
  },
  "menu-categories": {
    title: "メニューカテゴリー",
    description: "予約・メニュー・売上集計で使うカテゴリー。表示順を設定できます。",
    columns: ["カテゴリー", "表示順", "メニュー数"],
    rows: [
      ["ヘア（カット/カラー/パーマ）", "1", "3"],
      ["スパ・トリートメント", "2", "2"],
      ["フェイシャル", "3", "1"],
    ],
  },
  "sales-categories": {
    title: "売上カテゴリー",
    description: "売上集計の大区分。KPI分析の売上区分と連動します。",
    columns: ["区分", "内容", "集計対象"],
    rows: [
      ["技術売上", "施術・オプション", <Chip key="1" tone="ok">担当売上に計上</Chip>],
      ["店販売上", "店頭物販", <Chip key="2">店舗売上</Chip>],
      ["回数券売上", "購入/消化を分離計上", <Chip key="3" tone="accent">購入・消化</Chip>],
      ["会員売上", "入会金・サブスク", <Chip key="4">店舗売上</Chip>],
    ],
  },
  "sales-menus": {
    title: "売上メニュー",
    description: "施術以外の売上項目（指名料・延長・キャンセル料など）。",
    columns: ["売上メニュー", "カテゴリー", "単価"],
    rows: [
      ["指名料", "技術売上", "¥1,100"],
      ["延長10分", "技術売上", "¥1,100"],
      ["当日キャンセル料", "その他", "¥3,300"],
      ["入会金", "会員売上", "¥3,300"],
    ],
  },
  "payment-types": {
    title: "決済種別マスター",
    description: "会計・KPIの決済内訳で使う支払い方法。複合決済に対応。",
    columns: ["決済種別", "区分", "状態"],
    rows: [
      ["現金", "現金", <Chip key="1" tone="ok">有効</Chip>],
      ["クレジットカード", "キャッシュレス", <Chip key="2" tone="ok">有効</Chip>],
      ["PayPay", "QR", <Chip key="3" tone="ok">有効</Chip>],
      ["QRコード決済", "QR", <Chip key="4" tone="ok">有効</Chip>],
      ["ホットペッパーポイント", "ポイント", <Chip key="5" tone="ok">有効</Chip>],
      ["その他", "その他", <Chip key="6">有効</Chip>],
    ],
  },
  "review-types": {
    title: "口コミ種別マスター",
    description: "会計時にチェックする口コミ媒体。取得すると顧客タグに自動付与されます。",
    columns: ["口コミ種別", "付与タグ", "状態"],
    rows: [
      ["Google", "Google口コミ済", <Chip key="1" tone="ok">有効</Chip>],
      ["ホットペッパー", "HPB口コミ済", <Chip key="2" tone="ok">有効</Chip>],
      ["その他", "口コミ依頼済", <Chip key="3">有効</Chip>],
    ],
  },
  "cancel-reasons": {
    title: "キャンセル理由マスター",
    description: "予約キャンセル時の種別。KPIのキャンセル率分析に連動します。",
    columns: ["キャンセル種別", "区分", "KPI集計"],
    rows: [
      ["事前キャンセル", "事前", <Chip key="1">通常</Chip>],
      ["当日キャンセル", "当日", <Chip key="2" tone="warn">当日率に算入</Chip>],
      ["無断キャンセル", "無断", <Chip key="3" tone="warn">無断率に算入</Chip>],
    ],
  },
};

export function MasterMock({ kind }: { kind: keyof typeof MASTERS }) {
  const def = MASTERS[kind];
  return (
    <PageShell title={def.title} description={def.description} action={<AddButton />}>
      <MasterTable columns={def.columns} rows={def.rows} />
      <p className="mt-3 text-[11px] text-muted-foreground">※ モックUIです。店舗・ブランド単位で項目を追加/並び替え/有効化できる想定です。</p>
    </PageShell>
  );
}

// ===================== LINE =====================
export function LineMock({ kind }: { kind: "scenarios" | "broadcast" | "templates" | "auto-reply" }) {
  if (kind === "scenarios") {
    return (
      <PageShell title="シナリオ配信" description="登録後の経過日数に応じてステップ配信します。" action={<AddButton label="シナリオ作成" />}>
        <MasterTable
          columns={["シナリオ", "ステップ", "対象", "状態"]}
          rows={[
            ["初回フォロー", "3 ステップ", "新規登録者", <Chip key="1" tone="ok">稼働中</Chip>],
            ["誕生月クーポン", "2 ステップ", "全員（誕生月）", <Chip key="2" tone="ok">稼働中</Chip>],
            ["離反防止", "4 ステップ", "最終来店30日以上", <Chip key="3" tone="warn">下書き</Chip>],
          ]}
        />
      </PageShell>
    );
  }
  if (kind === "broadcast") {
    return (
      <PageShell title="一斉配信" description="セグメントを指定して一斉配信します。" action={<AddButton label="配信作成" />}>
        <MasterTable
          columns={["配信", "対象セグメント", "配信日時", "状態"]}
          rows={[
            ["5月限定 ヘッドスパ20%OFF", "再来 × 回数券なし", "5/20 11:00", <Chip key="1">送信済 412件</Chip>],
            ["新メニュー案内", "VIP × 女性", "5/28 10:00", <Chip key="2" tone="accent">予約</Chip>],
          ]}
        />
      </PageShell>
    );
  }
  if (kind === "templates") {
    return (
      <PageShell title="テンプレート" description="配信・自動応答で使うメッセージテンプレート。" action={<AddButton label="テンプレート作成" />}>
        <MasterTable
          columns={["テンプレート", "種別", "更新日"]}
          rows={[
            ["来店お礼", "テキスト", "5/12"],
            ["次回予約リマインド", "テキスト＋ボタン", "5/10"],
            ["回数券のご案内", "リッチメッセージ", "5/02"],
          ]}
        />
      </PageShell>
    );
  }
  return (
    <PageShell title="自動応答" description="キーワードやアクションに応じて自動で返信します。" action={<AddButton label="ルール作成" />}>
      <MasterTable
        columns={["トリガー", "応答内容", "状態"]}
        rows={[
          ["「予約」を含む", "予約フォームのURLを返信", <Chip key="1" tone="ok">有効</Chip>],
          ["友だち追加時", "初回カウンセリングフォームを案内", <Chip key="2" tone="ok">有効</Chip>],
          ["「キャンセル」を含む", "キャンセルポリシーを返信", <Chip key="3" tone="ok">有効</Chip>],
        ]}
      />
    </PageShell>
  );
}

// ===================== 強制リンク テンプレート =====================
const TEMPLATES: Record<string, { title: string; description: string; preview: React.ReactNode }> = {
  "personal-info": {
    title: "個人情報入力テンプレート",
    description: "予約フローで取得する入力項目を設定します（問診と連動）。",
    preview: (
      <div className="space-y-2">
        {["氏名（必須）", "電話番号（必須）", "メールアドレス", "生年月日", "来店動機", "個人情報の取り扱いに同意（必須）"].map((f) => (
          <div key={f} className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm">{f}</div>
        ))}
      </div>
    ),
  },
  confirm: {
    title: "確認画面テンプレート",
    description: "予約内容の確認画面の表示項目と文言を設定します。",
    preview: (
      <div className="rounded-xl border border-border p-4 text-sm">
        <div className="mb-2 font-semibold">ご予約内容の確認</div>
        <div className="space-y-1 text-muted-foreground">
          <div>メニュー：初回フェイシャル（60分）</div>
          <div>日時：2026/06/02 14:00</div>
          <div>担当：おまかせ</div>
        </div>
      </div>
    ),
  },
  thanks: {
    title: "サンクスページテンプレート",
    description: "予約完了後に表示するページ。LINE登録・口コミ導線も設定できます。",
    preview: (
      <div className="rounded-xl border border-border p-6 text-center text-sm">
        <div className="mb-1 text-lg font-semibold">ご予約ありがとうございます</div>
        <div className="text-muted-foreground">当日のご来店をお待ちしております。</div>
        <div className="mt-3 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white">LINEで友だち追加</div>
      </div>
    ),
  },
  reminder: {
    title: "リマインドテンプレート",
    description: "来店前のリマインド配信の文面・送信タイミングを設定します。",
    preview: (
      <div className="rounded-xl border border-border p-4 text-sm">
        <div className="mb-1 text-[11px] text-muted-foreground">前日 18:00 / LINE</div>
        明日 14:00 のご予約のリマインドです。お気をつけてお越しください🌿
      </div>
    ),
  },
  tags: {
    title: "タグテンプレート",
    description: "リンク経由の予約に自動付与する媒体タグを設定します。",
    preview: (
      <MasterTable
        columns={["リンク", "付与タグ", "引き継ぎ先"]}
        rows={[
          ["Meta広告用", <Chip key="1" tone="accent">媒体:Meta広告</Chip>, "顧客・予約・会計・LTV"],
          ["Instagram用", <Chip key="2" tone="accent">媒体:Instagram</Chip>, "顧客・予約・会計・LTV"],
          ["紹介用", <Chip key="3" tone="accent">媒体:紹介</Chip>, "顧客・予約・会計・LTV"],
        ]}
      />
    ),
  },
};

export function TemplateMock({ kind }: { kind: keyof typeof TEMPLATES }) {
  const def = TEMPLATES[kind];
  return (
    <PageShell title={def.title} description={def.description} action={<AddButton label="テンプレート保存" />}>
      <div className="max-w-2xl">{def.preview}</div>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><MockBadge /> 媒体別の予約リンクごとに、これらのテンプレートを割り当てられる想定です。</p>
    </PageShell>
  );
}
