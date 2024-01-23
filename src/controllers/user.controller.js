import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  };

const userRegistration = asyncHandler(async (req,res)=>{
  const {username,fullName,password,email} = req.body
  if(! ( username && fullName && email && password )){
    throw new ApiError(400,"All fields are required")
  }
  const isExistingUser = await User.findOne({
    $or:[{username},{email}]
  })

  if(isExistingUser){
    throw new ApiError(409,"User already Exis")
  }
  if (!isStrongPassword(password)) {
    throw new ApiError(400, "Password should be strong with minimum 8 characters, special character, and number");
  }
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
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
    coverimage:coverImage.url,
    avatar:Avtar.url,
    password
  })
  const createdUser = await User.findById(user._id).select("-password" ,"-refreshToken");
  if(!createdUser){
    throw new ApiError(500,"internal server error")
  }
  return res.status(201).json(new ApiResponse(201,createdUser,"user Register successfully"))
})

export {userRegistration}