import express from "express";
import { placeOrder } from "../controllers/orderController.js";
import requireAuth from "../middleware/requireAuth.js";

const orderRoute = express.Router();

orderRoute.post("/place", requireAuth, placeOrder);

export default orderRoute;