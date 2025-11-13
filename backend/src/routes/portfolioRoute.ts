import { Router } from "express";
import { createPortfolio, getPortfolios, getHoldings, getPortfolioHistory } from "../controllers/portfolioController.js";
import  requireAuth  from "../middleware/requireAuth.js";

const portfolioRoute = Router();

portfolioRoute.post("/create", requireAuth, createPortfolio);
portfolioRoute.get("/get", requireAuth, getPortfolios);
portfolioRoute.get("/holdings/:id", requireAuth, getHoldings);
portfolioRoute.get("/history/:id", requireAuth, getPortfolioHistory);

export default portfolioRoute;