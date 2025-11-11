import { Request, Response } from "express";
import redis from "../services/redisService.js";

export const checkRedisHealth = async (req: Request, res: Response) => {
    try{
        const start = Date.now();
        const reply = await redis.ping();
        const latencyMs = Date.now() - start;
        const healthy = reply === "PONG";

        return res.status(healthy ? 200 : 503).json({
            status: healthy ? "ok" : "degraded",
            reply,
            latencyMs
        });
    }catch(error){
        console.error("Redis health check failed:", error);
        return res.status(503).json({
            status: "error",
            message: "Unable to reach Redis",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
