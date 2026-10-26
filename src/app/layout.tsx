import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/Nav";
import { AppleLogo } from "@/components/ui";
import { Logo } from "@/components/Logo";
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
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="STE Mobile Care" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Sidebar shop={SHOP_NAME} />
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b-4 border-orange-500 bg-gradient-to-r from-black via-neutral-900 to-black px-4 py-3 shadow-md lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9 shadow ring-2 ring-orange-500" rounded="rounded-lg" />
            <span className="font-bold tracking-wide text-orange-400">{SHOP_NAME}</span>
            <AppleLogo className="h-4 w-4 text-orange-400" />
          </Link>
          <Link href="/ai" className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-black">
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
