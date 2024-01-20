import { asyncHandler } from "../utils/asyncHandler.js";

const userRegistration = asyncHandler(async (req,res)=>{
    res.status(200).json({
        message:"everything is ok"
    })
})

export {userRegistration}