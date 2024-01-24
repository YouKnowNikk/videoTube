import { Router } from "express";
import { userLogin, userLogout, userRegistration } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyUser } from "../middleware/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields(
        [
        {name:"avatar",maxCount:1},
        {name:"coverimage",maxCount:1}
        ]
),userRegistration);

router.route("/login").post(userLogin);
router.route("/logout").post(verifyUser,userLogout)
export default router