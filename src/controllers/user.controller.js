import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const registerUser = asyncHandler( async (req,res) => {
    // get user details from frontend
    // validation (!empty or invalid email etc)
    // check if user already exist: (by username or email)
    // check if avatar is present 
    // if availbale upload to cloudinary and get the url
    // create a user object - create entry in db
    // remove and refresh token from response
    // check for user creation
    // if created return response

    // step-1
    const {fullName, username, email, password } = req.body
    console.log(fullName,username,email,password);
    
    // Step-2
    if([fullName,username,email,password].some((feild)=>
        feild?.trim() === ""))
    {
        throw new ApiError(400,"All feilds are required");
    }

    // step-3
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) throw new ApiError(409,"User already exists");

    // step-4
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400,"Avatar is Required");

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