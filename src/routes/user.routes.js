import { Router } from "express";
import { userRegistration } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(userRegistration)
export default router