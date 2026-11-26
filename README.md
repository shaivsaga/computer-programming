# Login App (Next.js + React + PostgreSQL)

Sign up, log in, log out, and a protected `/dashboard`. Sessions live in PostgreSQL.
The app creates its tables on first use.

## Deploy with Vercel and Neon

1. Import the GitHub repository into Vercel.
2. In Vercel Storage, create a Neon database on the Free plan and connect it to the project's Production environment. This adds `DATABASE_URL`.
3. Deploy again so the running app picks up the new variable. Open the site and sign up.

You can also set `DATABASE_URL` directly in Vercel using a hosted PostgreSQL connection string with TLS enabled. For local development, copy `.env.example` to `.env.local`, enter your local PostgreSQL connection string, then run `npm ci` and `npm run dev`.

The schema is defined in [`lib/db.js`](lib/db.js).
