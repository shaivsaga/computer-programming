-- Run once against your database.
-- Local XAMPP: first run  CREATE DATABASE IF NOT EXISTS login_app;  then select it in phpMyAdmin.
-- Hosted (TiDB Cloud): open the SQL editor, pick your database, and run the rest.

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

-- sessions.id stores a SHA-256 hash of the cookie token, not the token itself.
CREATE TABLE IF NOT EXISTS sessions (
  id         CHAR(64) NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at)
);
