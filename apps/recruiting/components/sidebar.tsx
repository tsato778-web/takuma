"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto border-r border-[--color-border] bg-white px-3 py-5">
      <div className="px-3 pb-4 border-b border-[--color-border]">
        <p className="text-sm font-bold">NAORU 採用管理</p>
        <p className="mt-0.5 text-[11px] text-[--color-muted]">Recruiting ATS</p>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[--color-muted]">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={`${section.title}-${item.href}`}>
                  <Link
                    href={item.href}
                    className={[
                      "flex items-center justify-between rounded-md px-3 py-1.5 text-[13px]",
                      active
                        ? "bg-[--color-brand-soft] font-semibold text-[--color-brand]"
                        : "text-[--color-ink] hover:bg-[--color-surface-2]",
                    ].join(" ")}
                  >
                    <span>{item.label}</span>
                    {item.phase ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-[--color-muted]">
                        Phase {item.phase}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
