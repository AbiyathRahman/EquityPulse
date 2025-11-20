import { Router } from "express";
import { createPortfolio, deletePortfolio, getPortfolios, getHoldings, getPortfolioHistory, getPortfolioById, updatePortfolioName } from "../controllers/portfolioController.js";
import  requireAuth  from "../middleware/requireAuth.js";

const portfolioRoute = Router();

portfolioRoute.post("/create", requireAuth, createPortfolio);
portfolioRoute.get("/get", requireAuth, getPortfolios);
portfolioRoute.get("/holdings/:id", requireAuth, getHoldings);
portfolioRoute.get("/history/:id", requireAuth, getPortfolioHistory);
portfolioRoute.get("/:id", requireAuth, getPortfolioById);
portfolioRoute.patch("/:id", requireAuth, updatePortfolioName);
portfolioRoute.delete("/:id", requireAuth, deletePortfolio);

export default portfolioRoute;
