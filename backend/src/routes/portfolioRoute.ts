import { Router } from "express";
import { createPortfolio, getPortfolios } from "../controllers/portfolioController.js";
import  requireAuth  from "../middleware/requireAuth.js";

const portfolioRoute = Router();

portfolioRoute.post("/create", requireAuth, createPortfolio);
portfolioRoute.get("/get", requireAuth, getPortfolios);

export default portfolioRoute;