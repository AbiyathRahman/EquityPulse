import { Router } from "express";
import { checkRedisHealth } from "../controllers/healthController.js";

const healthRoute = Router();

healthRoute.get("/redis", checkRedisHealth);

export default healthRoute;
