import { Router } from "express";
import { getHoldings } from "../controllers/portfolioController.js";
import requireAuth from "../middleware/requireAuth.js";

const holdingsRoute = Router();

holdingsRoute.get("/:id", requireAuth, getHoldings);

export default holdingsRoute;
