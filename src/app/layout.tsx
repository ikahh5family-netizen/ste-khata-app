import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/Nav";
import { AppleLogo } from "@/components/ui";
import { SHOP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${SHOP_NAME} – Repair & Sales Record`,
  description: "iPhone repair shop app by Star Tech Electronics – repair jobs, parts sales, stock, credit khata and expenses, with AI assistant.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="STE Mobile Care" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Sidebar shop={SHOP_NAME} />
        <header className="no-print sticky top-0 z-20 border-b-[3px] border-orange-500 bg-[#111111] text-white shadow-[0_6px_22px_-12px_rgba(249,115,22,0.75)] lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-2.5">
            <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="STE Mobile Care home">
              <span className="shrink-0 rounded-xl border border-orange-500 bg-orange-500 p-0.5 shadow-[0_0_16px_rgba(249,115,22,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="STE logo" width={36} height={36} className="h-9 w-9 rounded-[9px] object-cover" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-black tracking-tight text-white">
                  <span className="truncate">{SHOP_NAME}</span>
                  <AppleLogo className="h-4 w-4 shrink-0 text-orange-400" />
                </span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-orange-300">Star Tech Electronics · Since 2003</span>
              </span>
            </Link>
            <Link href="/ai" className="shrink-0 rounded-full border border-orange-400 bg-orange-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-orange-400">
              ✦ AI
            </Link>
          </div>
        </header>
        <main className="pb-24 lg:pb-8 lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-8">{children}</div>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
