/**
 * 初期データ投入（何度実行しても同じ結果になるよう upsert で書く）
 *
 *   npm run db:seed
 *
 * ログインできるユーザーは環境変数 SEED_ADMINS で指定する。
 *   SEED_ADMINS="佐藤拓磨:sato@example.com,若林:wakabayashi@example.com"
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ------------------------------------------------------------
// 選考フェーズ（要件4）
// funnelStep は要件20のファネル位置。到達済み判定に使うため単調増加させる。
// ------------------------------------------------------------
const STAGES = [
  { code: "line_registered", name: "LINE登録", kind: "prospect", funnelStep: 1, color: "#94a3b8" },
  { code: "survey_pending", name: "アンケート未回答", kind: "prospect", funnelStep: 1, color: "#94a3b8" },
  { code: "survey_done", name: "アンケート回答済み", kind: "prospect", funnelStep: 1, color: "#64748b" },
  { code: "not_applied", name: "未応募", kind: "prospect", funnelStep: 1, color: "#64748b" },
  { code: "applied", name: "応募済み", kind: "applied", funnelStep: 2, color: "#2563eb" },
  { code: "interview1_waiting", name: "一次面談待ち", kind: "interview", funnelStep: 2, color: "#3b82f6" },
  { code: "interview1_scheduled", name: "一次面談予定", kind: "interview", funnelStep: 2, color: "#3b82f6" },
  { code: "interview1_done", name: "一次面談実施済み", kind: "interview", funnelStep: 3, color: "#0ea5e9" },
  { code: "store_matching", name: "店舗マッチング中", kind: "visit", funnelStep: 3, color: "#06b6d4" },
  { code: "store_visit_waiting", name: "店舗見学待ち", kind: "visit", funnelStep: 3, color: "#06b6d4" },
  { code: "store_visit_scheduled", name: "店舗見学予定", kind: "visit", funnelStep: 3, color: "#06b6d4" },
  { code: "store_visit_done", name: "店舗見学済み", kind: "visit", funnelStep: 4, color: "#14b8a6" },
  { code: "final_waiting", name: "最終面談待ち", kind: "final", funnelStep: 4, color: "#14b8a6" },
  { code: "final_scheduled", name: "最終面談予定", kind: "final", funnelStep: 4, color: "#14b8a6" },
  { code: "final_done", name: "最終面談済み", kind: "final", funnelStep: 5, color: "#22c55e" },
  { code: "offer", name: "内定", kind: "offer", funnelStep: 6, color: "#16a34a" },
  { code: "offer_accepted", name: "内定承諾", kind: "offer", funnelStep: 7, color: "#15803d" },
  { code: "joining_scheduled", name: "入社予定", kind: "joined", funnelStep: 7, color: "#15803d" },
  { code: "joined", name: "入社済み", kind: "joined", funnelStep: 8, color: "#166534" },
  { code: "declined", name: "辞退", kind: "closed", funnelStep: null, color: "#f59e0b", isTerminal: true },
  { code: "rejected", name: "不採用", kind: "closed", funnelStep: null, color: "#ef4444", isTerminal: true },
];

// ------------------------------------------------------------
// タグ（要件8）
// ------------------------------------------------------------
const TAGS: { category: string; names: string[] }[] = [
  { category: "license", names: ["柔道整復師", "鍼灸師", "理学療法士", "その他資格"] },
  { category: "employment", names: ["新卒", "中途"] },
  { category: "concern", names: ["給料", "労働時間", "休日", "キャリア", "技術", "人間関係", "その他の悩み"] },
  { category: "behavior", names: ["アンケート済み", "応募済み", "動画視聴対象", "選考中", "内定"] },
  {
    category: "source",
    names: ["Instagram", "YouTube", "求人媒体", "人材紹介", "学校", "既存LINE", "紹介", "その他流入"],
  },
];

// ------------------------------------------------------------
// フォーム（要件9・要件5）
// ------------------------------------------------------------
const SURVEY_FIELDS = [
  { key: "employment_category", label: "新卒 / 中途", fieldType: "radio", required: true, mapsTo: "employmentCategory", options: ["新卒", "中途"] },
  { key: "licenses", label: "保有資格（複数選択可）", fieldType: "multiselect", required: true, mapsTo: "licenses", options: ["柔道整復師", "鍼灸師", "理学療法士", "その他", "取得予定"] },
  { key: "concerns", label: "現在の悩み（複数選択可）", fieldType: "multiselect", required: false, mapsTo: null, options: ["給料", "労働時間", "休日", "キャリア", "技術", "人間関係", "その他"] },
  { key: "desired_prefecture", label: "希望エリア（都道府県）", fieldType: "select", required: false, mapsTo: "desiredPrefecture", options: [] },
  { key: "change_timing", label: "転職検討時期", fieldType: "radio", required: false, mapsTo: "changeTiming", options: ["すぐにでも", "3か月以内", "半年以内", "1年以内", "未定"] },
  { key: "source", label: "NAORUを何で知りましたか", fieldType: "select", required: false, mapsTo: "source", options: ["Instagram", "YouTube", "求人媒体", "人材紹介", "学校", "紹介", "その他"] },
];

const APPLICATION_FIELDS = [
  { key: "full_name", label: "氏名", fieldType: "text", required: true, mapsTo: "fullName" },
  { key: "full_name_kana", label: "ふりがな", fieldType: "text", required: false, mapsTo: "fullNameKana" },
  { key: "birth_date", label: "生年月日", fieldType: "date", required: false, mapsTo: "birthDate" },
  { key: "age", label: "年齢", fieldType: "number", required: true, mapsTo: "age" },
  { key: "licenses", label: "資格（複数選択可）", fieldType: "multiselect", required: true, mapsTo: "licenses", options: ["柔道整復師", "鍼灸師", "理学療法士", "その他", "取得予定"] },
  { key: "experience_years", label: "施術歴（年）", fieldType: "number", required: false, mapsTo: "experienceYears" },
  { key: "photo", label: "顔写真", fieldType: "image", required: false, mapsTo: "photoPath" },
  { key: "nearest_station", label: "最寄り駅", fieldType: "station", required: true, mapsTo: "nearestStation" },
  { key: "current_company", label: "前職または現職の会社名", fieldType: "text", required: false, mapsTo: "currentCompany" },
  { key: "current_store", label: "店舗名", fieldType: "text", required: false, mapsTo: "currentStore" },
  { key: "change_reason", label: "転職理由", fieldType: "textarea", required: false, mapsTo: "changeReason" },
  { key: "prev_salary", label: "前職給与（円）", fieldType: "number", required: false, mapsTo: "prevSalary" },
  { key: "prev_working_hours", label: "前職勤務時間", fieldType: "text", required: false, mapsTo: "prevWorkingHours" },
  { key: "prev_days_off", label: "前職休日日数", fieldType: "text", required: false, mapsTo: "prevDaysOff" },
  { key: "desired_prefecture", label: "勤務希望エリア（第1希望・都道府県）", fieldType: "select", required: true, mapsTo: "desiredPrefecture" },
  { key: "desired_area_1", label: "勤務希望エリア（第1希望・詳細）", fieldType: "select", required: false, mapsTo: null },
  { key: "desired_area_2", label: "勤務希望エリア（第2希望）", fieldType: "select", required: false, mapsTo: null },
  { key: "desired_area_text", label: "希望エリアの補足", fieldType: "text", required: false, mapsTo: "desiredAreaText" },
  { key: "change_timing", label: "転職希望時期", fieldType: "radio", required: true, mapsTo: "changeTiming", options: ["すぐにでも", "3か月以内", "半年以内", "1年以内", "未定"] },
  { key: "family_status", label: "家庭状況", fieldType: "text", required: false, mapsTo: "familyStatus" },
  { key: "questions", label: "聞きたいこと", fieldType: "textarea", required: false, mapsTo: "questions" },
  { key: "source", label: "NAORUを何で知ったか", fieldType: "select", required: false, mapsTo: "source" },
  { key: "instagram", label: "Instagramアカウント", fieldType: "text", required: false, mapsTo: "instagram" },
  { key: "x_account", label: "Xアカウント", fieldType: "text", required: false, mapsTo: "xAccount" },
  { key: "interview_pref_1", label: "Zoom一次面談 第1希望日時", fieldType: "datetime", required: true, mapsTo: null },
  { key: "interview_pref_2", label: "Zoom一次面談 第2希望日時", fieldType: "datetime", required: true, mapsTo: null },
  { key: "interview_pref_3", label: "Zoom一次面談 第3希望日時", fieldType: "datetime", required: true, mapsTo: null },
];

async function main() {
  // --- 選考フェーズ ---
  for (const [index, stage] of STAGES.entries()) {
    await prisma.pipelineStage.upsert({
      where: { code: stage.code },
      create: {
        code: stage.code,
        name: stage.name,
        kind: stage.kind,
        funnelStep: stage.funnelStep,
        color: stage.color,
        sortOrder: (index + 1) * 10,
        isTerminal: stage.isTerminal ?? false,
      },
      update: {
        kind: stage.kind,
        funnelStep: stage.funnelStep,
        sortOrder: (index + 1) * 10,
        isTerminal: stage.isTerminal ?? false,
      },
    });
  }
  console.log(`選考フェーズ: ${STAGES.length}件`);

  // --- タグ ---
  let tagCount = 0;
  for (const group of TAGS) {
    for (const [index, name] of group.names.entries()) {
      await prisma.tag.upsert({
        where: { category_name: { category: group.category, name } },
        create: { category: group.category, name, sortOrder: index * 10, isSystem: true },
        update: { sortOrder: index * 10 },
      });
      tagCount++;
    }
  }
  console.log(`タグ: ${tagCount}件`);

  // --- 管理ユーザー ---
  // SEED_ADMINS="氏名:メール,氏名:メール" 形式。未設定なら既定の1名のみ。
  const adminsRaw = process.env.SEED_ADMINS ?? "佐藤拓磨:t.sato778@gmail.com";
  const admins = adminsRaw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, email] = entry.split(":").map((v) => v.trim());
      return { name, email: email?.toLowerCase() };
    })
    .filter((a): a is { name: string; email: string } => Boolean(a.name && a.email));

  for (const admin of admins) {
    await prisma.user.upsert({
      where: { email: admin.email },
      create: {
        email: admin.email,
        name: admin.name,
        role: "admin",
        kind: "headquarters",
        canLogin: true,
        isActive: true,
      },
      update: { name: admin.name, role: "admin", canLogin: true, isActive: true },
    });
  }
  console.log(`ログイン可能ユーザー: ${admins.length}名 (${admins.map((a) => a.email).join(", ")})`);
  if (!process.env.SEED_ADMINS) {
    console.log(
      "  ※ 若林さん・八尋さんの Google アカウントは SEED_ADMINS に追加して再実行してください",
    );
  }

  // --- フォーム ---
  const survey = await prisma.form.upsert({
    where: { code: "initial_survey" },
    create: {
      code: "initial_survey",
      name: "初回アンケート",
      type: "survey",
      description: "友だち追加後に回答してもらう属性アンケート（シナリオ配信の出し分けに使用）",
      settings: { onSubmit: { setStage: "survey_done", addTags: ["アンケート済み"] } },
    },
    update: {},
  });

  const application = await prisma.form.upsert({
    where: { code: "application" },
    create: {
      code: "application",
      name: "応募フォーム",
      type: "application",
      description: "要件5の全項目＋Zoom一次面談の希望日時（第3希望まで）",
      settings: {
        onSubmit: {
          setStage: "applied",
          addTags: ["応募済み", "選考中"],
          sendTemplates: ["応募完了", "採用PV"],
          thenSetStage: "interview1_waiting",
        },
      },
    },
    update: {},
  });

  const upsertFields = async (
    formId: string,
    fields: { key: string; label: string; fieldType: string; required: boolean; mapsTo: string | null; options?: string[] }[],
  ) => {
    for (const [index, field] of fields.entries()) {
      await prisma.formField.upsert({
        where: { formId_key: { formId, key: field.key } },
        create: {
          formId,
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          mapsTo: field.mapsTo,
          options: field.options?.length ? field.options : undefined,
          sortOrder: (index + 1) * 10,
        },
        update: {
          label: field.label,
          fieldType: field.fieldType,
          required: field.required,
          mapsTo: field.mapsTo,
          sortOrder: (index + 1) * 10,
        },
      });
    }
  };

  await upsertFields(survey.id, SURVEY_FIELDS);
  await upsertFields(application.id, APPLICATION_FIELDS);
  console.log(`フォーム: 2件（初回アンケート ${SURVEY_FIELDS.length}項目 / 応募フォーム ${APPLICATION_FIELDS.length}項目）`);

  // --- 回答に応じた自動タグ（要件9）---
  const surveyFields = await prisma.formField.findMany({ where: { formId: survey.id } });
  const tags = await prisma.tag.findMany();
  const findTag = (name: string) => tags.find((t) => t.name === name);

  const rules: { fieldKey: string; value: string; tagName: string }[] = [
    { fieldKey: "employment_category", value: "新卒", tagName: "新卒" },
    { fieldKey: "employment_category", value: "中途", tagName: "中途" },
    { fieldKey: "licenses", value: "柔道整復師", tagName: "柔道整復師" },
    { fieldKey: "licenses", value: "鍼灸師", tagName: "鍼灸師" },
    { fieldKey: "licenses", value: "理学療法士", tagName: "理学療法士" },
    { fieldKey: "concerns", value: "給料", tagName: "給料" },
    { fieldKey: "concerns", value: "労働時間", tagName: "労働時間" },
    { fieldKey: "concerns", value: "休日", tagName: "休日" },
    { fieldKey: "concerns", value: "キャリア", tagName: "キャリア" },
    { fieldKey: "concerns", value: "技術", tagName: "技術" },
    { fieldKey: "concerns", value: "人間関係", tagName: "人間関係" },
    { fieldKey: "source", value: "Instagram", tagName: "Instagram" },
    { fieldKey: "source", value: "YouTube", tagName: "YouTube" },
    { fieldKey: "source", value: "求人媒体", tagName: "求人媒体" },
    { fieldKey: "source", value: "人材紹介", tagName: "人材紹介" },
    { fieldKey: "source", value: "学校", tagName: "学校" },
    { fieldKey: "source", value: "紹介", tagName: "紹介" },
  ];

  let ruleCount = 0;
  for (const rule of rules) {
    const field = surveyFields.find((f) => f.key === rule.fieldKey);
    const tag = findTag(rule.tagName);
    if (!field || !tag) continue;
    await prisma.formFieldTagRule.upsert({
      where: {
        formFieldId_matchValue_tagId: {
          formFieldId: field.id,
          matchValue: rule.value,
          tagId: tag.id,
        },
      },
      create: { formFieldId: field.id, matchValue: rule.value, tagId: tag.id },
      update: {},
    });
    ruleCount++;
  }
  console.log(`自動タグルール: ${ruleCount}件`);

  // --- システム設定 ---
  const settings: { key: string; value: unknown }[] = [
    // A-5：既定は内定日ベース・暦年。画面から入社年度へ切替可能にする
    { key: "dashboard.year_axis", value: "offer_year" },
    { key: "dashboard.fiscal_year_start_month", value: 4 },
    { key: "line.dry_run", value: true },
  ];
  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value as never },
      update: {},
    });
  }
  console.log(`システム設定: ${settings.length}件`);

  console.log("\nエリア・店舗マスタは運用側からの一覧提供後に投入します（設計 A-7a）。");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
