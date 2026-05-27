import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { CUSTOMERS } from "@/lib/mock-data";
import { CustomerDetail } from "@/components/customer/customer-detail";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = CUSTOMERS.find((c) => c.id === params.id);
  if (!customer) notFound();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-2.5">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> 顧客一覧
        </Link>
        <span className="text-xs text-muted-foreground">/ {customer.name}</span>
      </div>
      <div className="min-h-0 flex-1">
        <CustomerDetail customer={customer} variant="page" />
      </div>
    </div>
  );
}
