import axios from "axios";
const polygon_url = 'https://api.massive.com';
const apiKey = process.env.POLY_API_KEY;
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
//# sourceMappingURL=polygonService.js.map