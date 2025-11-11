import { Router } from "express";
import { createPortfolio, getPortfolios, getHoldings } from "../controllers/portfolioController.js";
import requireAuth from "../middleware/requireAuth.js";
const portfolioRoute = Router();
portfolioRoute.post("/create", requireAuth, createPortfolio);
portfolioRoute.get("/get", requireAuth, getPortfolios);
portfolioRoute.get("/holdings/:id", requireAuth, getHoldings);
export default portfolioRoute;
//# sourceMappingURL=portfolioRoute.js.map