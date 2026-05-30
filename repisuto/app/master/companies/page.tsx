import { Plus, Building2 } from "lucide-react";

import { PageShell, MockBadge, Chip } from "@/components/admin/page-shell";
import { COMPANIES, BRANDS, STORES } from "@/lib/mock-data";

export default function CompaniesMasterPage() {
  return (
    <PageShell
      title="企業マスター"
      description="マルチテナント前提（1企業 N ブランド N 店舗）の最上位マスター。企業ごとに所属ブランド/店舗数・登録顧客数が一目で見えます。"
      action={<MockBadge />}
    >
      <div className="mb-3 flex items-center justify-end">
        <span className="inline-flex cursor-default items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground"><Plus className="h-3 w-3" />企業を追加（モック）</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {COMPANIES.map((c) => {
          const brands = BRANDS.filter((b) => b.companyCode === c.code);
          const stores = STORES.filter((s) => brands.some((b) => b.code === s.brandCode));
          return (
            <div key={c.code} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Building2 className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{c.code}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">所属ブランド</div>
                  <div className="text-base font-bold tabular-nums">{brands.length}</div>
                </div>
                <div className="rounded-md border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] text-muted-foreground">所属店舗</div>
                  <div className="text-base font-bold tabular-nums">{stores.length}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[10px] text-muted-foreground">ブランド一覧</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {brands.map((b) => <Chip key={b.code} tone="accent">{b.code}・{b.name}</Chip>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">※ モックUI。本実装では企業ごとの請求プラン・契約期間・利用料を管理します。</p>
    </PageShell>
  );
}
