import express from "express";
import { placeOrder, getPendingOrders } from "../controllers/orderController.js";
import requireAuth from "../middleware/requireAuth.js";
const orderRoute = express.Router();
orderRoute.post("/place", requireAuth, placeOrder);
orderRoute.get("/pending/:portfolioId", requireAuth, getPendingOrders);
export default orderRoute;
//# sourceMappingURL=orderRoute.js.map