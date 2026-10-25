"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function ShareAppLink() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const linkInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(new URL("/", window.location.href).href);
  }, []);

  async function copyLink() {
    if (!url) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard access on a LAN HTTP address may be blocked by the browser.
      linkInput.current?.focus();
      linkInput.current?.select();
      setCopyError(true);
    }
  }

  return (
    <section className="card mb-5 overflow-hidden border-orange-200 p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-orange-200 bg-[#171717] px-4 py-3 text-white">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-lg text-black" aria-hidden="true">↗</span>
        <div>
          <h2 className="text-sm font-bold">Use STE on your browser &amp; mobile</h2>
          <p className="text-xs text-orange-200">Open the same link on your phone and computer.</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={linkInput}
            aria-label="Current app link"
            readOnly
            value={url || "Getting app link…"}
            onFocus={(event) => event.currentTarget.select()}
            className="input min-w-0 flex-1 font-mono text-xs"
          />
          <button type="button" disabled={!url} onClick={copyLink} className="btn shrink-0 bg-orange-500 text-black hover:bg-orange-400">
            {copied ? "✓ Copied" : "Copy App Link"}
          </button>
        </div>
        {copyError && <p className="text-xs font-medium text-orange-800">Clipboard permission was blocked. The link above is selected—copy it manually.</p>}
        <p className="text-xs leading-relaxed text-slate-600">
          On your phone, open the link in Chrome or Safari, then use <strong>Add to Home Screen</strong>. Jobs and sales are saved in the
          connected PostgreSQL database—not by the home-screen shortcut. Download regular JSON backups from the card below.
        </p>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          <strong>For lasting data:</strong> this preview URL is for testing and may expire or reset. Deploy this app to a permanent host with
          persistent PostgreSQL for a stable link. This app has no login yet, so do not share a public link containing real customer data.
          {" "}<Link href="/help" className="font-bold underline underline-offset-2">Setup guide →</Link>
        </p>
      </div>
    </section>
  );
}
