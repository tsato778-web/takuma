import { Ticket as TicketIcon } from "lucide-react";

import { PageShell, MasterTable, AddButton, Chip } from "@/components/admin/page-shell";
import { CUSTOMERS, formatCustomerNo } from "@/lib/mock-data";
import { TICKET_PLANS, yen } from "@/lib/pos";

export default function TicketsPage() {
  const holders = CUSTOMERS.flatMap((c) => c.tickets.map((t) => ({ c, t })));

  return (
    <PageShell title="回数券" description="販売中プランの管理と、保有顧客の消化状況。" action={<AddButton label="回数券プラン作成" />}>
      <div className="mb-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">販売中プラン</div>
        <MasterTable
          columns={["プラン", "回数", "時間", "価格", "消化単価", "有効期限", "対応メニュー"]}
          rows={TICKET_PLANS.map((p) => [
            <span key="n" className="inline-flex items-center gap-1 font-medium"><TicketIcon className="h-3.5 w-3.5 text-accent" />{p.name}</span>,
            `${p.count}回`,
            `${[60, 90, 45, 60][TICKET_PLANS.indexOf(p)] ?? 60}分`,
            yen(p.price),
            yen(Math.round(p.price / p.count)),
            `${p.validMonths}ヶ月`,
            p.menus,
          ])}
        />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">保有顧客の消化状況</div>
        <MasterTable
          columns={["顧客", "回数券", "消化 / 総", "残", "有効期限"]}
          rows={holders.map(({ c, t }) => [
            <span key="c"><span className="font-medium">{c.name}</span> <span className="text-[11px] text-muted-foreground">No.{formatCustomerNo(c.customerNo)}</span></span>,
            t.name,
            `${t.totalCount - t.remaining} / ${t.totalCount}`,
            t.remaining === 0 ? <Chip key="r" tone="warn">残0</Chip> : t.remaining === 1 ? <Chip key="r" tone="warn">残1</Chip> : <Chip key="r" tone="accent">残{t.remaining}</Chip>,
            t.validUntil.replace(/-/g, "/"),
          ])}
        />
      </div>
    </PageShell>
  );
}
