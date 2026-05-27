"use client";

import * as React from "react";
import { Camera, Pencil, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { jpDate } from "@/lib/customer-data";
import { CHART_FIELDS, CHART_STATUS_STYLE, type ChartRecord, type ChartStatus } from "@/lib/charts";

type FormFields = Pick<
  ChartRecord,
  "counseling" | "treatment" | "productsUsed" | "finish" | "homecare" | "nextProposal" | "caution"
>;

export function ChartDetailDialog({
  record,
  startInEdit,
  onOpenChange,
  onSave,
}: {
  record: ChartRecord | null;
  startInEdit?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: ChartRecord) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormFields>({
    counseling: "",
    treatment: "",
    productsUsed: "",
    finish: "",
    homecare: "",
    nextProposal: "",
    caution: "",
  });

  React.useEffect(() => {
    if (record) {
      setForm({
        counseling: record.counseling,
        treatment: record.treatment,
        productsUsed: record.productsUsed,
        finish: record.finish,
        homecare: record.homecare,
        nextProposal: record.nextProposal,
        caution: record.caution,
      });
      setEditing(startInEdit ?? record.status === "未記入");
    }
  }, [record, startInEdit]);

  function save(status: ChartStatus) {
    if (!record) return;
    onSave({ ...record, ...form, status });
    onOpenChange(false);
  }

  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto thin-scrollbar">
        {record && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                {record.customerName}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", CHART_STATUS_STYLE[record.status])}>
                  {record.status}
                </span>
              </DialogTitle>
              <DialogDescription>
                {jpDate(record.date)} ・ {record.menus} ・ 担当 {record.staffName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {CHART_FIELDS.map((f) => {
                const value = form[f.key as keyof FormFields];
                return (
                  <div key={f.key}>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">{f.label}</div>
                    {editing ? (
                      <textarea
                        value={value}
                        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                        rows={f.key === "counseling" || f.key === "treatment" ? 2 : 1}
                        className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder={`${f.label}を入力`}
                      />
                    ) : (
                      <div className={cn("rounded-md bg-secondary/40 px-3 py-2 text-sm", !value && "text-muted-foreground")}>
                        {value || "未記入"}
                      </div>
                    )}
                  </div>
                );
              })}

              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">ビフォーアフター写真</div>
                <div className="flex gap-2">
                  {["Before", "After"].map((lbl) => (
                    <div key={lbl} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground">
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px]">{lbl}</span>
                    </div>
                  ))}
                  {editing && (
                    <button className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-primary/40 text-xs text-primary">
                      ＋ 追加
                    </button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => save("下書き")}>
                    下書き保存
                  </Button>
                  <Button onClick={() => save("記入済")}>記入完了</Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" /> 編集
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
