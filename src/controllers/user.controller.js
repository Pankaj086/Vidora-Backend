import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500,"Something Went wrong while generating Access and Refresh token")
    }
}

const registerUser = asyncHandler( async (req,res) => {

    const validateEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };    

    // step-1
    const {fullName, username, email, password } = req.body
    // console.log(fullName,username,email,password);
    
    // Step-2
    if([fullName,username,email,password].some((field)=>
        field?.trim() === ""))
    {
        throw new ApiError(400,"All feilds are required");
    }

    // checking email is valid or not
    if (!validateEmail(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    // step-3
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    // step-4
    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0]?.path;
    }

    if(!avatarLocalPath) throw new ApiError(400,"Avatar is Required");

    if(existedUser){
        fs.unlinkSync(avatarLocalPath);
        if(coverImageLocalPath){
            fs.unlinkSync(coverImageLocalPath);
        }
        return res.status(409).json({
            message:"User already exist"
        })
    }


    // step-5
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400,"Avatar is Required");

    // step-6
    const user = await User.create({
        fullName,
        username:username.toLowerCase(),
        email,
        password,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong by registering the user")
    }

    // step-7
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

} )

const loginUser = asyncHandler( async (req,res) => {

    const { username, email, password } = req.body;
    if(!username && !email){
        throw new ApiError(400,"Username or Email is required");
    }

    const user = await User.findOne({
        $or: [ {email}, {username} ]
    })

    if(!user){
        throw new ApiError(404,"User doesn't exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials");
    }

    const {accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        // after doing this cookie can only be modified by server not by frontend
        httpOnly:true,
        secure:true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out"))
})

const refreshAccessToken = asyncHandler( async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(404,"unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(404,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(404,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        
        const { newAccessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,
            {
                accessToken:newAccessToken,
                refreshToken:newRefreshToken
            },
            "Access Token Refreshed"
        ))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler( async(req,res)=>{
    
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordValid = user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Current Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password Changed Successfully")
    )
})

const getCurrentUser = asyncHandler( async(req,res)=>{

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "User Found Successfully"
        )
    )
})

const updateAccountDetails = asyncHandler( async(req,res)=>{
    const { fullName , email } = req.body;
    if(!(fullName || email)){
        throw new ApiError(400,"All feilds required");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName:fullName,
                email:email
            }
        },
        {
            new:true //update hone ke baad jo info hogi wo return hogi
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler( async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar File");
    }

    let user = await User.findById(req.user?._id);
    const oldAvatarUrl = user?.avatar;

    user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    if(oldAvatarUrl){
        await deleteFromCloudinary(oldAvatarUrl);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Updated Avatar Successfully")
    )
})

const updateUserCoverImage = asyncHandler( async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading Cover Image File");
    }

    let user = await User.findById(req.user?._id);
    const oldCoverImageUrl = user?.coverImage;

    user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    if(oldCoverImageUrl){
        await deleteFromCloudinary(oldCoverImageUrl);
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Updated Cover Image Successfully")
    )
})

export{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
}