import dotenv from "dotenv";
import { Redis } from "ioredis";

// Ensure env vars are loaded even if this module is imported before the app entrypoint
dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL is not set. Point it to your external Redis instance (e.g. Render Redis or Upstash)."
  );
}

const redis = new Redis(redisUrl);

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis Error:", err));

export default redis;
