"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav";
import { AppleLogo } from "./ui";
import { Logo } from "./Logo";

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
      <div className="flex items-center gap-3 border-b-4 border-orange-500 bg-gradient-to-r from-black via-neutral-900 to-black px-5 py-4">
        <Logo className="h-12 w-12 shadow ring-2 ring-orange-500" />
        <div>
          <div className="flex items-center gap-1 font-bold leading-tight tracking-wide text-orange-400">
            <AppleLogo className="h-4 w-4 text-orange-400" />
            {shop}
          </div>
          <div className="text-xs text-neutral-400">Star Tech Electronics · Since 2003</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive(path, i.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
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
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {mobile.map((h) => {
          const i = all.find((x) => x.href === h)!;
          const active = h === "/more" ? moreActive : isActive(path, h);
          return (
            <Link
              key={h}
              href={h}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-indigo-600" : "text-slate-500"}`}
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

