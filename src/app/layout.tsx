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
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/images/ste-logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="STE Mobile Care" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Sidebar shop={SHOP_NAME} />
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-orange-200 bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 shadow-sm lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/ste-logo.png" alt="STE Logo" className="h-9 w-9 rounded-lg shadow ring-2 ring-white/60" />
            <span className="font-bold text-slate-900">{SHOP_NAME}</span>
            <AppleLogo className="h-4 w-4 text-slate-900" />
          </Link>
          <Link href="/ai" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            ✨ AI
          </Link>
        </header>
        <main className="pb-24 lg:pb-8 lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-8">{children}</div>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
