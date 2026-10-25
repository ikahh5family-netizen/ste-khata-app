# STE Mobile Care — Apni Browser / Mobile pe use karein (Data Save ke saath)

## Data kaise save hota hai?
Ye app internet pe chalti hai aur saara data ek **PostgreSQL database** mein save hota hai (`DATABASE_URL` environment variable se connect hoti hai). Jis database se app judi hai, wahan data hamesha saved rehta hai — phone se kholo, computer se kholo, kahin se bhi.

**Backup:** App ke andar **More → Help** page se (ya seedha `/api/backup`) ek JSON file download karein jismein sab kuch (customers, jobs, sales, stock, khata, kharcha) hota hai. Har hafte ek baar ye file WhatsApp / Google Drive / USB mein save kar lein.

**Mobile pe app jaisa:** Hosted URL ko phone ke Chrome/Safari mein kholein → menu → **"Add to Home Screen"**. Ab ye ek real app ki tarah home screen pe aa jayegi (PWA manifest + STE logo icon already added).

---

## Option 1 — Free Cloud (Recommended)
1. Is code ko **GitHub** pe upload karein.
2. **Neon.tech** (ya Supabase) pe free account banayein → ek free **PostgreSQL** database create karein → connection string copy karein.
3. **Vercel.com** pe naya project → GitHub repo import karein → Environment Variables mein add karein:
   - `DATABASE_URL` = Neon ka connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`)
4. Deploy karein. Vercel ka URL (e.g. `https://ste-mobile-care.vercel.app`) kisi bhi browser/mobile mein kholein — data hamesha cloud mein saved rahega.

## Option 2 — Apne PC / Laptop pe (Ghar / Dukaan)
1. PC mein **PostgreSQL** install karein, ek database banayein (e.g. `app_db`).
2. `.env` file mein set karein: `DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/app_db`
3. Terminal mein:
   ```bash
   npm install
   npm run build
   npm run start
   ```
   PC ko on rakhein.
4. Mobile ko **same WiFi** se jodein aur browser mein dalein: `http://<PC-KA-IP>:3000`
   (PC ka IP check: Windows pe `ipconfig`, Linux/Mac pe `ip addr`)
5. Data aapke PC ke database mein saved rahega.

## Option 3 — Railway.app (One-click)
1. **Railway.app** pe account banayein (GitHub se login).
2. New Project → **PostgreSQL** add karein.
3. GitHub se ye app deploy karein — `DATABASE_URL` mostly automatic set ho jata hai (warna Postgres service ka link manually add karein).
4. Railway ka public URL mobile/browser mein use karein.

---

## Notes
- App ka link sirf apne paas rakhein (koi login nahi hai — jiske paas link hai woh saara data dekh sakta hai).
- Database tables app ke first load pe khud ban jati hain (`ensureSchema`), aur `/api/health` se check ki ja sakti hain.
- AI ke liye `OPENAI_API_KEY` set karein (optional) — warna built-in smart mode chalta hai.
