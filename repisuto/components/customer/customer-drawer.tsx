"use client";

import { useRouter } from "next/navigation";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CustomerDetail } from "./customer-detail";
import type { Customer } from "@/lib/mock-data";

export function CustomerDrawer({
  customer,
  onOpenChange,
}: {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  return (
    <Sheet open={!!customer} onOpenChange={onOpenChange}>
      {customer && (
        <SheetContent className="p-0">
          <CustomerDetail
            customer={customer}
            variant="drawer"
            onOpenFull={() => {
              onOpenChange(false);
              router.push(`/customers/${customer.id}`);
            }}
          />
        </SheetContent>
      )}
    </Sheet>
  );
}
