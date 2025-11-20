import express from "express";
import { updateUser } from "../controllers/userController.js";
import requireAuth from "../middleware/requireAuth.js";
const userRoute = express.Router();
userRoute.patch("/update", requireAuth, updateUser);
export default userRoute;
//# sourceMappingURL=userRoute.js.map