"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className
      )}
      {...props}
    >
      <DialogPrimitive.Title className="sr-only">顧客詳細</DialogPrimitive.Title>
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-md p-1 opacity-70 transition-opacity hover:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
        <X className="h-4 w-4" />
        <span className="sr-only">閉じる</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
