import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,

    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true,
    },
    coverimage: {
        type: String,
    },
    watchHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    }],
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true })
userSchema.pre("save", async function (next) {
    if (!this.isModified('password')) {
        return next()
    }
    else {
        this.password = await bcrypt.hash(this.password, 10)
        next()
    }
})
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}
userSchema.methods.genrateAccessToken = function() {
  return  jwt.sign({
        _id : this._id,
        email:this.email,
        fullName:this.fullName,
        username:this.username
    },process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1d'})

}
userSchema.methods.genrateRefreshToken = function() {
    return  jwt.sign({
          _id : this._id,
          
      },process.env.REFRESH_TOKEN_SECRET,{expiresIn:'10d'})
  
  }
export const User = mongoose.model("User", userSchema)