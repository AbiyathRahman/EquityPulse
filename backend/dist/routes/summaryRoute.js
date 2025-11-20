import { Router } from "express";
import { getSummary } from "../controllers/summaryController.js";
import requireAuth from "../middleware/requireAuth.js";
const summaryRoute = Router();
summaryRoute.get("/get/:id", requireAuth, getSummary);
summaryRoute.get("/:id", requireAuth, getSummary);
export default summaryRoute;
//# sourceMappingURL=summaryRoute.js.map