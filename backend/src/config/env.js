import "dotenv/config";

/**
 * Single source of truth for configuration.
 *
 * The original project embedded the database name, host and user directly in
 * `config/Database.js` and sent `Access-Control-Allow-Origin: *` to every
 * caller. Both are fixed here: values come from the environment, and the
 * CORS allow-list is explicit.
 */

const toBool = (value, fallback = false) =>
  value === undefined ? fallback : ["1", "true", "yes", "on"].includes(String(value).toLowerCase());

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 5000),
  storage: (process.env.STORAGE ?? "memory").toLowerCase(),
  database: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME ?? "spk_wood",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    logging: toBool(process.env.DB_LOGGING, false),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = () => config.env === "production";
