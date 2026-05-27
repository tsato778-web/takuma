"use client";

import { PageShell, MockBadge } from "@/components/admin/page-shell";
import { FormBuilder } from "@/components/admin/form-builder";
import { BASE_INTAKE } from "@/lib/forms";

export default function PersonalInfoTemplatePage() {
  return (
    <PageShell
      title="個人情報入力テンプレート"
      description="予約時にお客様が入力するフォームをテンプレート化。業種別ベースから展開できます。"
      action={<span className="cursor-default rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">テンプレートを保存</span>}
    >
      <p className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground"><MockBadge /> 項目の追加・並び替え・必須/任意・回答のタグ化を設定できます。予約リンクごとにこのテンプレートを割り当てます。</p>
      <FormBuilder initialFields={BASE_INTAKE[0].fields.map((f) => ({ ...f }))} templates={BASE_INTAKE} />
    </PageShell>
  );
}
