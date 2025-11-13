import redis from "../services/redisService.js";
import axios from "axios";
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
export const getLastTrade = async (symbol) => {
    const key = `lasttrade:${symbol}`;
    return cacheGetOrSet(key, async () => {
        const { data } = await axios.get(`${polygon_url}/v2/last/trades/${symbol}/?apiKey=${apiKey}`);
        return data?.results || null;
    }, 60); // cache for 1 minute
};
//# sourceMappingURL=polygonService.js.map