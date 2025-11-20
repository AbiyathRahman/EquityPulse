import { Router } from "express";
import { registerUser, loginUser, getCurrentUser, changePassword } from "../controllers/authController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login",loginUser);
router.get("/me", requireAuth, getCurrentUser);
router.post("/change-password", requireAuth, changePassword);

export default router;
