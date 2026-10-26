# STE Mobile Care — use on your phone and browser with saved data

## Quick facts

- The URL returned by the in-project preview is a **test link**, not guaranteed permanent hosting. Data in a preview sandbox may be reset; export backups regularly. This project cannot create or register a permanent public domain automatically.
- The application saves live repair jobs, parts, customer records, sales, payments and expenses in **PostgreSQL**. A browser home-screen icon is just a shortcut; it does **not** provide an offline database.
- For the **same records on mobile and PC**, both devices must open the same deployed URL pointing to the same persistent `DATABASE_URL`.
- The dashboard has **Export Database Backup** and **Import Database Backup**. A downloaded JSON file contains customer data (and possibly IMEI/passcodes) in plain text. SHA-256 integrity checking is **not encryption**. Keep files private. Import can cache the snapshot offline, but restoring the live application requires its server and database.
- **Security:** There is currently **no login/access control**. Do not make a public deployment with real customer data until access control has been added. Keep secrets in server environment variables, never in `NEXT_PUBLIC_*`.

## Recommended: hosted app + persistent Postgres

1. Upload this project to a **private** repository on [GitHub](https://github.com/new). Do not commit `.env` or your database password.
2. Create a persistent PostgreSQL database on [Neon](https://neon.tech) (or Supabase/Railway/Postgres provider) and copy the provided connection string.
3. Import the GitHub repo at [Vercel](https://vercel.com/new). In Project Settings → Environment Variables, set `DATABASE_URL` to the connection string. Do not use a `NEXT_PUBLIC_` prefix. Deploy.
4. Open the Vercel deployment URL in desktop and mobile browsers. Create a test repair job on desktop, refresh mobile, and verify it appears. The Vercel-provided URL is your browser/mobile link, and data is saved in the connected Postgres database as long as you maintain the hosting and database subscriptions/plan.
5. Android Chrome: menu (⋮) → **Add to Home screen** / **Install**. iPhone Safari: Share → **Add to Home Screen**.
6. Export a fresh JSON backup after significant data changes and store it privately; test a restore on a separate/test installation before relying on it.

The app creates its tables automatically on startup / first request via `ensureSchema`. You can check `/api/health` after deployment. Refer to your host's current plan limits and backups; a free tier may sleep or have quotas.

### Optional AI provider

Mistral Large 4 is an option in the AI Assistant model selector. Set `MISTRAL_API_KEY` in your server's environment to enable it (model ID `mistral-large-4`, official API at `https://api.mistral.ai/v1/chat/completions`). Without a key the built-in assistant remains available. To enable OpenAI instead, set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`). AI provider charges may apply, and selected AI requests send the shop data needed for the answer to that provider.

## Local shop PC, same Wi-Fi only

1. Install Node.js and PostgreSQL on your PC; create a database.
2. Create a local `.env` file with `DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DB_NAME` (use your own credentials; never share the file).
3. From the project folder run `npm install`, `npm run build`, and `npm run start -- -H 0.0.0.0` (requires your PC to stay switched on).
4. On the PC use `http://localhost:3000`; on a phone connected to the same Wi-Fi, use `http://YOUR-PC-LAN-IP:3000`. Open the appropriate port in the PC firewall if necessary. Find the IP with `ipconfig` on Windows or `ip addr` on Linux.
5. Your records live in the PC's Postgres database. A hard drive failure without a separate database/JSON backup can still lose data. Remote use outside the Wi-Fi needs proper hosting or a securely configured VPN.
