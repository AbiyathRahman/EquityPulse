import { Request, Response } from "express";
import { getLastTradeSafe, getPreviousClose } from "../services/polygonService.js";

const isMarketOpen = () => {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  // Approximate US market hours 13:30-20:00 UTC (9:30-16:00 ET, ignoring DST shifts)
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 13 * 60 + 30 && totalMinutes <= 20 * 60;
};

export const getAssetQuote = async (req: Request, res: Response) => {
  const symbol = String(req.params.symbol ?? "").toUpperCase();
  if (!symbol.trim()) {
    return res.status(400).json({ error: "Symbol is required" });
  }
  try {
    const [live, prev] = await Promise.all([
      getLastTradeSafe(symbol),
      getPreviousClose(symbol),
    ]);
    const price = live?.price ?? live?.p ?? prev?.close ?? null;
    if (!price) {
      return res.status(404).json({ error: "Quote unavailable" });
    }
    const previousClose = prev?.close ?? null;
    const change = previousClose !== null ? price - previousClose : null;
    const changePct =
      previousClose && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null;
    return res.status(200).json({
      symbol,
      price,
      previousClose,
      change,
      changePct,
      marketStatus: isMarketOpen() ? "open" : "closed",
      asOf: live?.timeStamp ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to fetch asset quote" });
  }
};
