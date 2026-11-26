# Login App (Next.js + React + MySQL)

Sign up, log in, log out, and a protected `/dashboard`. Sessions live in MySQL.
The app creates its own tables on first use, so there is no SQL to run.

## Put it online (Vercel + TiDB Cloud)

1. Create a GitHub repo and upload these files (Add file > Upload files).
2. In Vercel: Add New > Project > import that repo > Deploy.
3. In the Vercel project: Storage (or Marketplace) > TiDB Cloud > create a database and connect it to the project.
   This adds the `TIDB_*` variables automatically.
4. Redeploy. Open your Vercel URL and sign up.

Manual option: skip step 3 and add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`
in Settings > Environment Variables (see `.env.example`).

`sql/schema.sql` is only a reference copy of the tables.
