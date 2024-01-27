import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };
  export const genrateAccessTokenAndRefreshToken=async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken =  user.genrateAccessToken();
        const refreshToken =  user.genrateRefreshToken();
        user.refreshToken= refreshToken;
        await user.save({ validateBeforeSave: false })
        return {refreshToken , accessToken}
    } catch (error) {
        throw new ApiError (500, " something wnet wrong in genrating tokens")
    }
 }
const userRegistration = asyncHandler(async (req,res)=>{
  const {username,fullName,password,email} = req.body
  if(! ( username && fullName && email && password )){
    throw new ApiError(400,"All fields are required")
  }
  const isExistingUser = await User.findOne({
    $or:[{username},{email}]
  })

  if(isExistingUser){
    throw new ApiError(409,"User already Exist")
  }
  if (!isStrongPassword(password)) {
    throw new ApiError(400, "Password should be strong with minimum 8 characters, special character, and number");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
      coverImageLocalPath = req.files.coverimage[0].path
  }

  if(!avatarLocalPath){
    throw new ApiError(400,"Avtar is required")
  }
  const Avtar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  if(!Avtar){
    throw new ApiError(500,"something went wrong with Avatar")
  }
  const user = await User.create({
    fullName,
    email,
    username,
    coverimage:coverImage?.url || "",
    avatar:Avtar.url,
    password
  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if(!createdUser){
    throw new ApiError(500,"internal server error")
  }
  return res.status(201).json(new ApiResponse(201,createdUser,"user Register successfully"))
})

const userLogin = asyncHandler(async (req,res)=>{
    const{email,username,password}=req.body;
    if(!((email || username) && password)){
        throw new ApiError(400,"Fields are Required")
    }
    const user = await User.findOne({
        $or:[{email},{username}]
    })
    if (!user) {
        throw new ApiError(404, "Credential are wrong")
    }
    const ispasswordValid = user.isPasswordCorrect(password);
    if(!ispasswordValid){
        throw new ApiError(404, "Credential are wrong")
    }
    const {accessToken,refreshToken}= await genrateAccessTokenAndRefreshToken(user._id);
    const loggedInuser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInuser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const userLogout = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,
    {
        $unset:{refreshToken: 1}
    },{
        new: true
    })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken= asyncHandler(async(req,res)=>{
    const {refreshToken , accessToken} = await genrateAccessTokenAndRefreshToken(req.user._id)
  
  const options = {
    httpOnly: true,
    secure: true
}
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(
          200, 
          {accessToken, refreshToken: refreshToken},
          "Access token refreshed"
      )
  )
})

const updateProfile = asyncHandler(async(req,res)=>{
   try {
    const {email,username,fullName}= req.body;
   const updatedUser = await User.findByIdAndUpdate(req.user._id,{$set:{fullName,username,email}},{new:true,runValidators:true}).select("-password -refreshtoken") ;
   if(!updatedUser){
    throw new ApiError(500 ,"Having trouble to update profile")
   }
   res.status(208).json(new ApiResponse(208,updatedUser,"Profile Updated")
)
   } catch (error) {
    
    if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map((err) => err.message);
        throw new ApiError(400, validationErrors);
    }

    if (error.name === "MongoServerError" && error.code === 11000) {
        
        const duplicateField = Object.keys(error.keyValue)[0];
        throw new ApiError(400, `${duplicateField} is already in use`);
    }
    
    throw new ApiError(500, "Internal server error Duplicate key");
}})
export {userRegistration,userLogin,userLogout,refreshAccessToken,updateProfile}