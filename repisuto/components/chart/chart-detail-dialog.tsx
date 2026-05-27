"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { customerById } from "@/lib/mock-data";
import { CustomerChart } from "./customer-chart";

export function ChartDialog({
  open,
  customerId,
  initialVisitId,
  onOpenChange,
}: {
  open: boolean;
  customerId: string | null;
  initialVisitId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const customer = customerId ? customerById(customerId) : undefined;
  return (
    <Dialog open={open && !!customer} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {customer && (
          <>
            <DialogHeader>
              <DialogTitle>カルテ — {customer.name}</DialogTitle>
              <DialogDescription>お客様入力カルテ（初回問診）とスタッフ記録（来院ごと）</DialogDescription>
            </DialogHeader>
            <div className="h-[74vh]">
              <CustomerChart customer={customer} initialVisitId={initialVisitId} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
