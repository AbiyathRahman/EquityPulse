import express from "express";
import { getAssetQuote } from "../controllers/assetController.js";
import requireAuth from "../middleware/requireAuth.js";

const assetRoute = express.Router();

assetRoute.get("/:symbol", requireAuth, getAssetQuote);

export default assetRoute;
