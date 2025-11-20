import redis from "../services/redisService.js";
import axios, { AxiosError } from "axios";

const polygon_url =
  process.env.POLYGON_BASE_URL?.replace(/\/$/, "") ??
  "https://api.polygon.io";
const apiKey = process.env.POLY_API_KEY;
const MAX_REQUESTS_PER_MIN =
  Number(process.env.POLY_MAX_RPM ?? 40) || 40;

let windowStart = Date.now();
let windowCount = 0;

const canRequest = () => {
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_REQUESTS_PER_MIN) {
    return false;
  }
  windowCount += 1;
  return true;
};


const cacheGetOrSet = async (key: string, fetchFn: () => Promise<any>, ttlSeconds = 86400) => {
    const cached = await redis.get(key);
    if(cached){
        console.log('Cache hit');
        return JSON.parse(cached);
    }
    console.log('Fetching from Polygon');
    const data = await fetchFn();
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    return data;
}

export const getPreviousClose = async (symbol: string) => {
    if (!canRequest()) {
        return null;
    }
    try {
        const response = await axios.get(`${polygon_url}/v2/aggs/ticker/${symbol}/prev?apiKey=${apiKey}`);
        const result = response.data.results?.[0];
        if (!result)
            return null;
        return {
            symbol,
            close: result.c,
            high: result.h,
            low: result.l,
            open: result.o,
            volume: result.v,
            timeStamp: result.t
        };
    }
    catch (error) {
        console.error(error);
        return null;
    }
};

export const getLastTrade = async (symbol: string) => {
  const key = `lasttrade:${symbol}`;
  return cacheGetOrSet(
    key,
    async () => {
      if (!canRequest()) return null;
      const { data } = await axios.get(
        `${polygon_url}/v2/last/trade/${symbol}?apiKey=${apiKey}`
      );
      const result = data?.results;
      if (!result) return null;
      const price = result.price ?? result.p ?? null;
      return price ? { ...result, price } : result;
    },
    60
  ); // cache for 1 minute
};

// Safe helper that returns null instead of throwing if the API rejects (403)
export const getLastTradeSafe = async (symbol: string) => {
  try {
    return await getLastTrade(symbol);
  } catch (error) {
    const err = error as AxiosError;
    if (err?.response?.status === 403) {
      // Fallback: try previous close
      const prev = await getPreviousClose(symbol);
      if (prev?.close) {
        return { price: prev.close, timeStamp: prev.timeStamp, symbol };
      }
    }
    return null;
  }
};
