"use client";

import * as React from "react";
import { Search, ExternalLink, Crown } from "lucide-react";

import { CUSTOMERS, formatCustomerNo, type Customer } from "@/lib/mock-data";
import { jpDate } from "@/lib/customer-data";
import { CustomerDrawer } from "@/components/customer/customer-drawer";
import { cn } from "@/lib/utils";

const yen = (n: number) => `¥${n.toLocaleString()}`;

export default function CustomersPage() {
  const [selected, setSelected] = React.useState<Customer | null>(null);
  const [q, setQ] = React.useState("");

  const list = CUSTOMERS.filter(
    (c) => !q || c.name.includes(q) || c.kana.includes(q) || String(c.customerNo).includes(q)
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <h1 className="text-sm font-semibold">顧客</h1>
        <span className="text-xs text-muted-foreground">{list.length}名</span>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="氏名・カナ・No で検索"
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar p-5">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">No</th>
                <th className="px-4 py-2.5 font-medium">氏名</th>
                <th className="px-4 py-2.5 font-medium">タグ</th>
                <th className="px-4 py-2.5 font-medium">初回媒体</th>
                <th className="px-4 py-2.5 text-right font-medium">LTV</th>
                <th className="px-4 py-2.5 font-medium">最終来店</th>
                <th className="px-4 py-2.5 font-medium">会員</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                >
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{formatCustomerNo(c.customerNo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.kana}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{c.firstSource}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{yen(c.ltv)}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">{jpDate(c.lastVisitDate)}</td>
                  <td className="px-4 py-2.5">
                    {c.monthlyMember.active && <Crown className="h-4 w-4 text-amber-500" />}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ExternalLink className={cn("ml-auto h-4 w-4 text-muted-foreground")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">行をクリックで右ドロワー表示 →「詳細を開く」でフルページに遷移します。</p>
      </div>

      <CustomerDrawer customer={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
