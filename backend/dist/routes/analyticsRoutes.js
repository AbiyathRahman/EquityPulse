import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import requireAuth from "../middleware/requireAuth.js";
const analyticsRoute = express.Router();
analyticsRoute.get("/get/:id", requireAuth, getAnalytics);
export default analyticsRoute;
//# sourceMappingURL=analyticsRoutes.js.map