// Vercel Serverless Function: /api/kpi?academy=tech|mgmt
//
// UTAGE の継続課金一覧CSV（個人情報を除外したもの）を data/subscriptions.tsv から
// 読み込み、コホート別の継続率・退会率を計算して返します。

import fs from "node:fs";
import path from "node:path";

// 初月無料キャンペーンの開始日（この日以降の申込 = 無料コホート）
const FREE_CAMPAIGN_START = new Date("2026-04-01T00:00:00+09:00");

// ---------- パーサー ----------
function parseDateJst(str) {
  if (!str) return null;
  return new Date(str.trim().replace(" ", "T") + "+09:00");
}

function parseStatus(raw) {
  const str = (raw || "").trim();
  if (str.startsWith("継続中")) return { active: true, cancelAt: null };
  const m = str.match(/解除済\(([^)]+)\)/);
  if (m) return { active: false, cancelAt: parseDateJst(m[1]) };
  return { active: false, cancelAt: null };
}

let cached = null;
function loadSubscriptions() {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "subscriptions.tsv");
  const raw = fs.readFileSync(file, "utf-8");
  const lines = raw.trim().split("\n");
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 7) continue;
    const signupAt = parseDateJst(cols[0]);
    if (!signupAt) continue;
    const st = parseStatus(cols[6]);
    records.push({
      signupAt,
      academy: cols[1],
      plan: cols[2],
      amount: parseInt(cols[3], 10) || 0,
      active: st.active,
      cancelAt: st.cancelAt,
    });
  }
  cached = records;
  return records;
}

// ---------- 日付ユーティリティ ----------
function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// ---------- コホート計算 ----------
/**
 * 指定コホートのNヶ月後継続率を計算
 * - 対象: signupAt <= now - Nヶ月 の契約
 * - 継続: 現時点でactive または 解除日 > signupAt + Nヶ月
 */
function calcRetention(cohort, monthsAfter, now) {
  const threshold = addMonths(now, -monthsAfter);
  const eligible = cohort.filter((s) => s.signupAt <= threshold);
  if (eligible.length === 0) return { value: null, n: 0 };

  const retained = eligible.filter((s) => {
    if (s.active) return true;
    const cutoff = addMonths(s.signupAt, monthsAfter);
    return s.cancelAt && s.cancelAt > cutoff;
  });

  return {
    value: Math.round((retained.length / eligible.length) * 1000) / 10,
    n: eligible.length,
  };
}

// ---------- 統計 ----------
function calcStats(subs, now) {
  const activeCount = subs.filter((s) => s.active).length;

  const thisMonth = monthStart(now);
  const lastMonth = addMonths(thisMonth, -1);
  const nextMonth = addMonths(thisMonth, 1);

  const thisMonthSignups = subs.filter(
    (s) => s.signupAt >= thisMonth && s.signupAt < nextMonth
  ).length;
  const lastMonthSignups = subs.filter(
    (s) => s.signupAt >= lastMonth && s.signupAt < thisMonth
  ).length;

  // 先月末時点のアクティブ数 = 先月以前に申込 かつ (現在継続中 OR 解除日 >= 今月開始)
  const lastMonthEndActive = subs.filter((s) => {
    if (s.signupAt >= thisMonth) return false;
    if (s.active) return true;
    return s.cancelAt && s.cancelAt >= thisMonth;
  }).length;

  const memberDeltaPct =
    lastMonthEndActive > 0
      ? Math.round(((activeCount - lastMonthEndActive) / lastMonthEndActive) * 1000) / 10
      : 0;

  const signupDeltaPct =
    lastMonthSignups > 0
      ? Math.round(((thisMonthSignups - lastMonthSignups) / lastMonthSignups) * 1000) / 10
      : 0;

  // 3ヶ月継続率（全体）
  const ret3m = calcRetention(subs, 3, now);

  // 月次売上概算（継続中 × 2980円）
  const revenue = activeCount * 2980;
  const lastRevenue = lastMonthEndActive * 2980;
  const revenueDeltaPct =
    lastRevenue > 0
      ? Math.round(((revenue - lastRevenue) / lastRevenue) * 1000) / 10
      : 0;

  return {
    members: {
      v: activeCount.toLocaleString(),
      d: `${memberDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(memberDeltaPct)}% 先月比`,
      cls: memberDeltaPct >= 0 ? "delta-up" : "delta-down",
    },
    newSignups: {
      v: thisMonthSignups.toString(),
      d:
        lastMonthSignups > 0
          ? `${signupDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(signupDeltaPct)}% 先月比`
          : "先月実績なし",
      cls: signupDeltaPct >= 0 ? "delta-up" : "delta-down",
    },
    retention3m: {
      v: ret3m.value !== null ? `${ret3m.value}%` : "—",
      d: ret3m.value !== null ? `対象 N=${ret3m.n}` : "データ蓄積中",
      cls: "delta-up",
    },
    revenue: {
      v: `¥${Math.round(revenue / 10000).toLocaleString()}万`,
      d:
        lastRevenue > 0
          ? `${revenueDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(revenueDeltaPct)}% 先月比`
          : "先月実績なし",
      cls: revenueDeltaPct >= 0 ? "delta-up" : "delta-down",
    },
  };
}

function calcMonthlySignups(subs, now) {
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    trend.push(subs.filter((s) => s.signupAt >= start && s.signupAt < end).length);
  }
  return trend;
}

// ---------- ペイロード生成 ----------
function buildTechPayload(now) {
  const subs = loadSubscriptions();
  const free = subs.filter((s) => s.signupAt >= FREE_CAMPAIGN_START);
  const paid = subs.filter((s) => s.signupAt < FREE_CAMPAIGN_START);

  const stats = calcStats(subs, now);
  const enrollTrend = calcMonthlySignups(subs, now);

  const retFree = [1, 2, 3].map((m) => calcRetention(free, m, now).value);
  const retPaid = [1, 2, 3].map((m) => calcRetention(paid, m, now).value);
  const chFree = retFree.map((v) => (v !== null ? Math.round((100 - v) * 10) / 10 : null));
  const chPaid = retPaid.map((v) => (v !== null ? Math.round((100 - v) * 10) / 10 : null));

  const freeActive = free.filter((s) => s.active).length;
  const paidActive = paid.filter((s) => s.active).length;

  return {
    name: "技術アカデミー",
    heading: "技術アカデミー ダッシュボード",
    stats: {
      members: stats.members,
      courses: stats.newSignups, // スロット再利用: 今月の新規入会
      completion: stats.retention3m, // スロット再利用: 3ヶ月継続率
      revenue: stats.revenue,
    },
    enrollTrend,
    cohort: {
      freeN: free.length,
      paidN: paid.length,
      retention: { free: retFree, paid: retPaid },
      churn: { free: chFree, paid: chPaid },
      note: {
        retention:
          "💡 <strong>インサイト：</strong>初月無料プラン（2026年4月以降の申込）はまだ1ヶ月経過していないため、継続率は来月以降から算出可能です（データ蓄積中）。初月有料コホート（2026年3月以前）は実測値が算出されています。無料キャンペーンが1サイクル回ったタイミングで、両コホートの比較が可能になります。",
        churn:
          "⚠️ <strong>注意点：</strong>初月無料プランは計測期間経過次第、累計退会率が算出されます。初月有料プランの累計退会率は1/2/3ヶ月後の実績ベースです。有料移行時（2ヶ月目）の退会率が特に重要な観察ポイントになります。",
      },
    },
    courses: [
      {
        code: "BP",
        color: "#2563eb",
        title: "関節整体 ベーシックプラン",
        meta: `累計契約 ${subs.length}件・継続中 ${subs.filter((s) => s.active).length}名`,
        progress: Math.round(
          (subs.filter((s) => s.active).length / Math.max(subs.length, 1)) * 100
        ),
      },
      {
        code: "無",
        color: "#f59e0b",
        title: "初月無料コホート",
        meta: `登録 ${free.length}名・継続中 ${freeActive}名（2026年4月以降）`,
        progress: free.length > 0 ? Math.round((freeActive / free.length) * 100) : 0,
      },
      {
        code: "有",
        color: "#2563eb",
        title: "初月有料コホート",
        meta: `登録 ${paid.length}名・継続中 ${paidActive}名（2026年3月以前）`,
        progress: paid.length > 0 ? Math.round((paidActive / paid.length) * 100) : 0,
      },
    ],
    schedule: [
      { d: "24", m: "APR", title: "セミナー：肩関節モビリゼーション", meta: "20:00 - 21:30・オンライン" },
      { d: "28", m: "APR", title: "Q&Aライブセッション", meta: "20:00 - 21:00・オンライン" },
      { d: "30", m: "APR", title: "月次レビュー会", meta: "19:00 - 20:00・オンライン" },
    ],
  };
}

function buildMgmtPayload() {
  return {
    name: "経営アカデミー",
    heading: "経営アカデミー ダッシュボード（準備中）",
    stats: {
      members:    { v: "—", d: "UTAGE未連携",   cls: "delta-up" },
      courses:    { v: "—", d: "—",              cls: "delta-up" },
      completion: { v: "—", d: "—",              cls: "delta-up" },
      revenue:    { v: "—", d: "—",              cls: "delta-up" },
    },
    enrollTrend: new Array(12).fill(0),
    cohort: {
      freeN: 0,
      paidN: 0,
      retention: { free: [null, null, null], paid: [null, null, null] },
      churn:     { free: [null, null, null], paid: [null, null, null] },
      note: {
        retention:
          "⚙️ 経営アカデミーは現時点で UTAGE 連携されていません。データソースが用意され次第、技術アカデミーと同じ集計が表示されます。",
        churn:
          "⚙️ 経営アカデミーは現時点で UTAGE 連携されていません。",
      },
    },
    courses: [],
    schedule: [],
    notReady: true,
  };
}

export default async function handler(req, res) {
  const academy = (req.query.academy || "tech").toString();
  const now = new Date();

  try {
    let payload;
    if (academy === "tech") payload = buildTechPayload(now);
    else if (academy === "mgmt") payload = buildMgmtPayload();
    else return res.status(404).json({ error: "unknown academy", academy });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      ...payload,
      _source: academy === "tech" ? "csv" : "placeholder",
      _hasApiKey: Boolean(process.env.UTAGE_API_KEY),
      _generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal", message: err.message });
  }
}
