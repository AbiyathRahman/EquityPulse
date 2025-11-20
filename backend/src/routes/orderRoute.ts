import express from "express";
import { placeOrder, getPendingOrders, cancelOrder, getOrderHistory } from "../controllers/orderController.js";
import requireAuth from "../middleware/requireAuth.js";

const orderRoute = express.Router();

orderRoute.post("/place", requireAuth, placeOrder);
orderRoute.get("/pending/:portfolioId", requireAuth, getPendingOrders);
orderRoute.get("/history/:portfolioId", requireAuth, getOrderHistory);
orderRoute.delete("/:id", requireAuth, cancelOrder);

export default orderRoute;
