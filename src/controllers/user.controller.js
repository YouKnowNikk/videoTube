import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

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
   return res.status(208).json(new ApiResponse(208,updatedUser,"Profile Updated")
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

const changePassword = asyncHandler(async(req,res)=>{
  const{oldPassword,newPassword}=req.body;
  if (!isStrongPassword(newPassword)) {
    throw new ApiError(400, "New Password should be strong with minimum 8 characters, special character, and number");
  }
   const user = await User.findById(req.user?._id)
   if(!user){
    throw new ApiError("400","Invalid Access")
   }
   console.log(user);
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
   if(!isPasswordCorrect){
    throw new ApiError("401","Incorrect old password")
   }
   user.password = newPassword;
   await user.save({validateBeforeSave:false});
   return res.status(208).json(new ApiResponse(208,{},"password updated succesfully"))
})

const updateAvatar=asyncHandler(async(req,res)=>{
  const userBeforeUpdate = await User.findById(req.user?._id).select('avatar');
  
  const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
      throw new ApiError(400, "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{
      $set:{
        avatar:avatar.url
      }
    },{new:true}).select("-password -refreshToken")
    if (userBeforeUpdate.avatar) {
      console.log("check");
      deleteFromCloudinary(userBeforeUpdate.avatar);
    }
    return res.status(208).json(new ApiResponse(208,user,"Avtar Updated"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
  const {username} = req.params;
  if(!username?.trim()){
    throw new ApiError(400,"username not found")
  }
 const channel = await User.aggregate([{
  $match:{
    username : username?.toLowerCase()
  }
 },
 {
  $lookup:{
    from:"subscriptions",
    localField:"_id",
    foreignField:"channel",
    as:"subscribers"
  }
 },
 {
  $lookup:{
    from:"subscriptions",
    localField:"_id",
    foreignField:"subscriber",
    as:"subscribedTo"
  }
 },
 {
  $addFields: {
    subscriberCount: {
      $size: "$subscribers"
    },
    channelSubscribeCount: {
      $size: "$subscribedTo"
    },
    isSubscribed: {
      $cond: {
        if: {
          $in: [req.user?._id, "$subscribers.subscriber"]
        },
        then: true,
        else: false
      }
    }
  }
},
{
  $project:{
    fullName:1,
    username:1,
    avatar:1,
    coverimage:1,
    subscriberCount:1,
    isSubscribed:1,
    channel:1
  }
}
])
if(!channel?.length){
  throw new ApiError(404,"channel don't exist")
}
return res.status(200).json(new ApiResponse(200,channel[0],"channel fetched succesfully"))
})

const getUserWatchhistory= asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)     
       }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:'watchHistory',
        pipeline:[
          {
            $lookup:{
              from:'users',
              localField:'owner',
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    username:1,
                    avatar:1,
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      $addFields:{
        $first:"$owner"
      }
    }
  ])
        as:''
  return res.status(200).json(new ApiResponse(200,user[0].watchHistory,"Fetched user History successfully"))
})
export {userRegistration,userLogin,userLogout,refreshAccessToken,updateProfile,changePassword,updateAvatar,getUserChannelProfile,getUserWatchhistory}