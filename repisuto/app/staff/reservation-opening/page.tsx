"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { PageShell } from "@/components/admin/page-shell";
import { OPENING_OPTIONS, CURRENT_OPENING_RULE } from "@/lib/shifts";

// お客様予約画面（◯×）と同じ lib/shifts の開放設定を共有（設定がそのまま◯×判定に反映される）
const OPTIONS = OPENING_OPTIONS;

export default function ReservationOpeningPage() {
  const [selected, setSelected] = React.useState<string>(CURRENT_OPENING_RULE);
  const [adminOverride, setAdminOverride] = React.useState(true);

  return (
    <PageShell title="予約開放設定" description="店舗ごとに、お客様予約画面で予約を受け付ける範囲を設定します。" action={<span className="cursor-default rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">保存</span>}>
      <div className="max-w-2xl space-y-3">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setSelected(o.id)}
            className={cn("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors", selected === o.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40")}
          >
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", selected === o.id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
              {selected === o.id && <Check className="h-3.5 w-3.5" />}
            </span>
            <div>
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-[11px] text-muted-foreground">{o.desc}</div>
            </div>
          </button>
        ))}

        <label className="mt-2 flex items-center gap-2 rounded-xl border border-border p-4 text-sm">
          <input type="checkbox" checked={adminOverride} onChange={(e) => setAdminOverride(e.target.checked)} className="h-4 w-4 accent-primary" />
          <div>
            <div className="font-medium">管理画面からは例外的に予約可能</div>
            <div className="text-[11px] text-muted-foreground">開放範囲外でも、スタッフは台帳から予約を作成できます。</div>
          </div>
        </label>

        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
          お客様予約画面（◯×表示）は、この設定に従って予約可能な枠のみ「◯」を表示します。出勤表・営業時間・重複（既存予約）と合わせて空き判定します。
        </div>
      </div>
    </PageShell>
  );
}
