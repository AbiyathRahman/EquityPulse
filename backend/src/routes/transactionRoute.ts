import { Router } from "express";
import { createTransaction, getTransactions } from "../controllers/transactionController.js";
import requireAuth from "../middleware/requireAuth.js";

const transactionRoute = Router();

transactionRoute.post("/create", requireAuth, createTransaction);
transactionRoute.get("/get/:id", requireAuth, getTransactions);

export default transactionRoute;