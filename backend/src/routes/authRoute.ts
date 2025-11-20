import { Router } from "express";
import { registerUser, loginUser, getCurrentUser } from "../controllers/authController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login",loginUser);
router.get("/me", requireAuth, getCurrentUser);

export default router;
