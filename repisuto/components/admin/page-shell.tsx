import * as React from "react";

export function PageShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold">{title}</h1>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="thin-scrollbar flex-1 overflow-auto p-5">{children}</div>
    </div>
  );
}

export function MockBadge() {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      モックUI
    </span>
  );
}

export function AddButton({ label = "新規作成" }: { label?: string }) {
  return (
    <span className="inline-flex cursor-default items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
      ＋ {label}
    </span>
  );
}

export function MasterTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">{c}</th>
            ))}
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
              {r.map((cell, j) => (
                <td key={j} className="px-4 py-2.5">{cell}</td>
              ))}
              <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">編集</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "ok" | "warn" | "muted" }) {
  const cls = {
    default: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/12 text-accent",
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    muted: "bg-secondary text-muted-foreground",
  }[tone];
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}
