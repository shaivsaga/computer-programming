import mysql from "mysql2/promise";

// Works with DB_* variables, or the TIDB_* variables that the Vercel TiDB Cloud
// integration adds automatically.
const env = process.env;
const host = env.DB_HOST || env.TIDB_HOST;
const useSsl = env.DB_SSL === "true" || (!env.DB_SSL && Boolean(env.TIDB_HOST));

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis;

const rawPool =
  globalForDb._loginAppPool ??
  mysql.createPool({
    host,
    port: Number(env.DB_PORT || env.TIDB_PORT || 3306),
    user: env.DB_USER || env.TIDB_USER,
    password: env.DB_PASSWORD ?? env.TIDB_PASSWORD,
    database: env.DB_NAME || env.TIDB_DATABASE,
    ssl: useSsl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: 5, // small on purpose: every serverless instance has its own pool
    maxIdle: 2,
    idleTimeout: 30000,
    enableKeepAlive: true,
  });

if (env.NODE_ENV !== "production") {
  globalForDb._loginAppPool = rawPool;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
     email         VARCHAR(254) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     UNIQUE KEY uq_users_email (email)
   )`,
  // id is a SHA-256 hash of the cookie token, not the token itself.
  `CREATE TABLE IF NOT EXISTS sessions (
     id         CHAR(64) NOT NULL,
     user_id    INT UNSIGNED NOT NULL,
     expires_at DATETIME NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (id),
     KEY idx_sessions_user (user_id),
     KEY idx_sessions_expires (expires_at)
   )`,
];

// Creates the tables the first time the app talks to the database.
let schemaReady;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA) await rawPool.query(sql);
    })().catch((err) => {
      schemaReady = undefined; // try again on the next request
      throw err;
    });
  }
  return schemaReady;
}

export const pool = {
  async execute(sql, params) {
    await ensureSchema();
    return rawPool.execute(sql, params);
  },
};
