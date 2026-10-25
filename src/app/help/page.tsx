import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="❓ Help — Apni Browser / Mobile pe kaise use karein" subtitle="Data save kaise hota hai aur app ko kahin bhi kaise chalayein" />

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">💾 Data kaise save hota hai?</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          Ye app internet pe chalti hai aur <b>saara data ek PostgreSQL database</b> mein save hota hai. Jis database se app juda hai, wahan data
          hamesha saved rehta hai — chahe aap phone se kholen, computer se, ya kahin aur se. App ko band karne se data nahi khota.
        </p>
        <p className="text-sm leading-relaxed text-slate-700">
          Data ko aur bhi safe rakhne ke liye neeche <b>Backup download</b> karein — ek JSON file ban jayegi jismein customers, jobs, sales, stock,
          khata, kharcha sab kuch hota hai. Us file ko WhatsApp / Google Drive / USB mein rakh lein.
        </p>
        <a href="/api/backup" className="btn-primary inline-flex">
          ⬇️ Download Data Backup (JSON)
        </a>
      </div>

      <div className="card space-y-3 border-indigo-200 bg-indigo-50/50">
        <h2 className="text-lg font-semibold">💾 Local Backup &amp; Restore (Dashboard buttons — fully offline)</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          Dashboard pe do buttons hain — <b>⬇️ Export Database Backup</b> aur <b>⬆️ Import Database Backup</b>. Ye dono buttons poori tarah aapke device pe
          kaam karte hain (browser ka local storage + file), bina kisi server ya database connection ke.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            <b>Export:</b> saara data (repair jobs, sales, customers, stock, khata, kharcha) ek secure <code className="rounded bg-white px-1">.json</code> file
            mein aapke device pe download ho jata hai (integrity checksum ke saath).
          </li>
          <li>
            <b>Import:</b> us file ko upload karein — data parse ho kar aapke device pe restore ho jata hai. Agar browser cache clear ho gaya ho ya Windows
            crash ho gaya ho, to bhi file se sab kuch wapas aa jata hai. Agar server available ho to server pe bhi automatic restore ho jata hai.
          </li>
          <li>Browser kholte hi app local copy ko server se sync karti hai — dono jagah data match rehta hai.</li>
        </ul>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">📱 Mobile pe app jaisa kaise banayein?</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          Jab app kisi hosted URL pe chal rahi ho (neeche options), to phone ke browser (Chrome / Safari) mein woh URL kholein, phir menu se{" "}
          <b>“Add to Home Screen”</b> karein. Ab ye app phone mein ek real app ki tarah icon ke saath khulegi — bilkul dukaan wali app jaisi.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">☁️ Option 1 — Free Cloud (sabse asaan, recommended)</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          <li>Is code ko <b>GitHub</b> pe upload karein.</li>
          <li>
            <b>Neon.tech</b> (ya Supabase) pe free account banayein aur wahan ek free <b>PostgreSQL database</b> create karein — sirf email se ho jata hai.
          </li>
          <li>
            <b>Vercel.com</b> pe project deploy karein aur Environment Variables mein <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> mein us database ka
            connection link daalein.
          </li>
          <li>Deploy hone ke baad Vercel ka URL copy karein — ab ye URL kisi bhi browser / mobile mein kholein. Data hamesha cloud mein saved rahega.</li>
        </ol>
        <p className="text-xs text-slate-500">Free plan mein kaam chal jayega. Baad mein apna domain (jaise ste-mobile-care.com) bhi jod sakte hain.</p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">🏠 Option 2 — Apne PC / Laptop pe (Ghar / Dukaan)</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          <li>Apne PC mein <b>PostgreSQL</b> install karein aur ek database banayein (jaise <code className="rounded bg-slate-100 px-1">app_db</code>).</li>
          <li>
            Project folder mein <code className="rounded bg-slate-100 px-1">npm install</code> aur <code className="rounded bg-slate-100 px-1">npm run build</code> karein.
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1">npm run start</code> karein — PC ko on rakhein (band hone se data ruk jata hai, par kharab nahi hota).
          </li>
          <li>
            Mobile ko <b>same WiFi</b> se jodein aur browser mein <code className="rounded bg-slate-100 px-1">http://PC-KA-IP:3000</code> dalein (IP check karne ke liye PC pe{" "}
            <code className="rounded bg-slate-100 px-1">ipconfig</code> ya <code className="rounded bg-slate-100 px-1">ip addr</code> chalayein).
          </li>
        </ol>
        <p className="text-xs text-slate-500">Data aapke PC ke database mein saved rahega. Dusre ghar se access ke liye Option 1 behtar hai.</p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">🚂 Option 3 — Railway.app (one-click)</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            <b>Railway.app</b> pe account banayein (GitHub se login).
          </li>
          <li>New Project → <b>PostgreSQL</b> add karein.</li>
          <li>GitHub se is app ko deploy karein — <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> automatic set ho jayega.</li>
          <li>Railway ka public URL copy karke mobile / browser mein use karein.</li>
        </ol>
      </div>

      <div className="card space-y-2 border-emerald-200 bg-emerald-50">
        <h2 className="text-lg font-semibold text-emerald-800">💡 Important Tips</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-emerald-900">
          <li>Har hafte ek baar <b>Backup download</b> karke file safe kar lein.</li>
          <li>App ka link sirf apne paas rakhein — jiske paas link hai woh saara data dekh sakta hai.</li>
          <li>Agar baad mein naya phone mile ya purana kharab ho, to bas naye phone mein same URL kholein — saara data wahin mil jayega.</li>
        </ul>
      </div>

      <div className="text-center text-sm">
        <Link href="/" className="btn-light">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
