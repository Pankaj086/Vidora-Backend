import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import fs from "fs";

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

export default registerUser