import { Redis } from "ioredis";

const redis = new Redis({
  host: process.env.UPSTASH_REDIS_REST_URL,
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err: Error) => console.error("Redis Error:", err));

export default redis;
