import { Router } from "express";
import { userRegistration } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([{name:"avatar",maxCount:1},{
    name:"coverimage",maxCount:1
}]),userRegistration)
export default router