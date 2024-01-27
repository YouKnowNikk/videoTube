import { Router } from "express";
import { refreshAccessToken, updateProfile, userLogin, userLogout, userRegistration } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyToken, verifyUser } from "../middleware/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields(
        [
        {name:"avatar",maxCount:1},
        {name:"coverimage",maxCount:1}
        ]
),userRegistration);

router.route("/login").post(userLogin);
router.route("/logout").post(verifyUser,userLogout);
router.route("/refreshtoken").post(verifyToken,refreshAccessToken)
router.route("/updateprofile").put(verifyToken,updateProfile)
export default router