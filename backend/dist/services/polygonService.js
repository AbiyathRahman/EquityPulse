import axios from "axios";
import redis from "../services/redisService.js";
const polygon_url = 'https://api.massive.com';
const apiKey = process.env.POLY_API_KEY;
const cacheGetOrSet = async (key, fetchFn, ttlSeconds = 86400) => {
    const cached = await redis.get(key);
    if (cached) {
        console.log('Cache hit');
        return JSON.parse(cached);
    }
    console.log('Fetching from Polygon');
    const data = await fetchFn();
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    return data;
};
export const getPreviousClose = async (symbol) => {
    const key = `prevclose:${symbol}`;
    return cacheGetOrSet(key, async () => {
        const { data } = await axios.get(`${polygon_url}/aggs/ticker/${symbol}/prev`, {
            params: { apiKey: apiKey },
        });
        return data.results?.[0] || null;
    }, 86400); // cache for 24h
};
export const getLastTrade = async (symbol) => {
    const key = `lasttrade:${symbol}`;
    return cacheGetOrSet(key, async () => {
        const { data } = await axios.get(`https://api.massive.io/v2/last/trade/${symbol}`, {
            params: { apiKey: apiKey },
        });
        return data?.results || null;
    }, 60); // cache for 1 minute
};
//# sourceMappingURL=polygonService.js.map