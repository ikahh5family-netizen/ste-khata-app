"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { AppleLogo } from "@/components/ui";

const items = navItems;

const mobile = ["/", "/jobs", "/sales", "/khata", "/more"];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path.startsWith(href);
}

export function Sidebar({ shop }: { shop: string }) {
  const path = usePathname();
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <Link href="/" className="flex min-h-24 items-center gap-3 border-b-[3px] border-orange-500 bg-[#111111] px-4 py-4 text-white" aria-label="STE Mobile Care home">
        <span className="shrink-0 rounded-xl border border-orange-500 bg-orange-500 p-0.5 shadow-[0_0_18px_rgba(249,115,22,0.25)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="STE logo" width={44} height={44} className="h-11 w-11 rounded-[9px] object-cover" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-black leading-tight tracking-tight text-white">
            {shop}
            <AppleLogo className="h-4 w-4 shrink-0 text-orange-400" />
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-orange-300">Star Tech Electronics</span>
          <span className="block text-[10px] text-slate-400">Since 2003 · iPhone specialists</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(path, i.href) ? "bg-orange-50 font-semibold text-orange-700 ring-1 ring-inset ring-orange-100" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
            }`}
          >
            <span className="text-lg">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <Link href="/jobs/new" className="btn-primary w-full">
          + New Repair Job
        </Link>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  const all = [...items, { href: "/more", label: "More", short: "More", icon: "☰" }];
  const moreActive = ["/inventory", "/expenses", "/reports", "/ai", "/more"].some((h) => path.startsWith(h));
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {mobile.map((h) => {
          const i = all.find((x) => x.href === h)!;
          const active = h === "/more" ? moreActive : isActive(path, h);
          return (
            <Link
              key={h}
              href={h}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-orange-600" : "text-slate-500"}`}
            >
              <span className="text-xl leading-none">{i.icon}</span>
              {i.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

