import dotenv from "dotenv";
import { Redis } from "ioredis";

// Ensure env vars are loaded even if this module is imported before the app entrypoint
dotenv.config();

const redisUrl = process.env.REDIS_URL;
const redisTlsEnv = process.env.REDIS_TLS;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL is not set. Point it to your external Redis instance (e.g. Render Redis or Upstash)."
  );
}

// Some hosted Redis providers (Upstash, Render with TLS) require TLS. Allow opting in via env.
const parsed = new URL(redisUrl);
const isUpstash = parsed.hostname.includes("upstash.io");
const preferTlsProtocol = redisUrl.toLowerCase().startsWith("rediss://");
const useTls =
  (redisTlsEnv ?? "").toLowerCase() === "true" || preferTlsProtocol || isUpstash;

// Force TLS if Upstash but protocol was accidentally left as redis://
const normalizedUrl =
  isUpstash && parsed.protocol === "redis:"
    ? redisUrl.replace(/^redis:\/\//i, "rediss://")
    : redisUrl;

const redis = new Redis(normalizedUrl, {
  // Keep connections alive and retry briefly on transient drops to avoid ECONNRESET floods
  keepAlive: 15_000,
  connectTimeout: 10_000,
  maxRetriesPerRequest: 5,
  retryStrategy: (times) => Math.min(times * 200, 2_000),
  tls: useTls ? { rejectUnauthorized: false } : undefined,
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis Error:", err));

export default redis;
