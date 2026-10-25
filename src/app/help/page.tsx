import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ShareAppLink } from "@/components/ShareAppLink";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Browser & Mobile Setup"
        subtitle="Use the same app on your phone and computer, with data saved safely"
      />
      <ShareAppLink />

      <div className="space-y-4">
        <section className="card border-orange-200">
          <h2 className="text-lg font-bold">Where is my data saved?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Repair jobs, customers, stock and sales are saved in the app&apos;s <strong>PostgreSQL database</strong>, not in your browser cache.
            Your phone and PC will see the same records only if they open the <strong>same deployment URL</strong> connected to the <strong>same database</strong>.
            Clearing your browser cache will not delete records stored in that database.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            The preview link is useful for testing but <strong>is not a permanent hosting guarantee</strong>. For long-term use, deploy to a host
            with a persistent PostgreSQL database. Your permanent link will be the URL provided by that host.
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">1. Get a permanent browser/mobile link</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li>Upload this project to a private <a className="font-semibold text-orange-700 underline" href="https://github.com/new" target="_blank" rel="noreferrer">GitHub repository</a>.</li>
            <li>Create a persistent PostgreSQL database on <a className="font-semibold text-orange-700 underline" href="https://neon.tech" target="_blank" rel="noreferrer">Neon</a> (or another Postgres host). Copy its connection string.</li>
            <li>Import the repository at <a className="font-semibold text-orange-700 underline" href="https://vercel.com/new" target="_blank" rel="noreferrer">Vercel</a>. Set the server-side environment variable <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> to your database connection string, then deploy.</li>
            <li>Open the resulting Vercel URL on both devices. Add a job on one device and refresh the other to confirm they share the same data.</li>
          </ol>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <strong>Privacy:</strong> This app currently has no login. Anyone with its public link could read and edit customer details. Do not
            store real customer records on a public deployment until access control is in place. Never put the database password or AI key in browser code.
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">2. Put the app on your phone&apos;s home screen</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            <li><strong>Android / Chrome:</strong> open your permanent app URL → ⋮ menu → <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
            <li><strong>iPhone / Safari:</strong> open the URL → Share icon → <strong>Add to Home Screen</strong>.</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">The icon is a shortcut. It does not make this database-backed app fully offline; use an internet connection to view or save live jobs.</p>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">3. Keep a backup</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            On the dashboard, use <strong>Export Database Backup</strong> to download a <code>.json</code> snapshot of all records. Keep a copy
            somewhere safe (for example, a private cloud drive or USB drive). <strong>Import Database Backup</strong> uploads the saved data to
            the connected server when it is available. If the server is down, the file is cached locally, but the live job and sales pages
            still require the server to come back before they can display those records.
          </p>
          <p className="mt-2 text-sm font-medium text-rose-700">The backup JSON includes private customer details and is NOT encrypted. A checksum detects corruption; it does not hide the data.</p>
          <a href="/api/backup" className="btn-light mt-3">⬇ Download server backup (online)</a>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">Optional: Mistral Large 4 AI</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            To enable the Mistral Large 4 option on the <Link href="/ai" className="font-semibold text-orange-700 underline">AI Assistant</Link> page,
            create an API key at <a href="https://console.mistral.ai/" target="_blank" rel="noreferrer" className="font-semibold text-orange-700 underline">Mistral AI</a>
            and set <code className="rounded bg-slate-100 px-1">MISTRAL_API_KEY</code> on your app server. The key stays on the server.
            Without a key, the built-in assistant is available at no API cost. API usage may incur provider charges.
          </p>
        </section>

        <p className="pb-5 text-center"><Link href="/" className="btn-light">← Back to Dashboard</Link></p>
      </div>
    </div>
  );
}
