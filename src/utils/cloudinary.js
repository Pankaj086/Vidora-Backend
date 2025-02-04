import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // file uploaded successfully
        // console.log("File is uploaded on cloudinary",response);
        return response;
    } catch (error) {
        return null;
    }
    finally{
        // remove the locally saved temporary file as the upload option is failed
        fs.unlinkSync(localFilePath);
    }
}

const deleteFromCloudinary = async(cloudinaryUrl) => {
    // example url = https://res.cloudinary.com/dtehsnlbo/image/upload/v1738567511/qmwcrsgti3lnexus2sye.jpg
    const publicId = cloudinaryUrl.split('/').pop().split('.')[0];
    
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Image deleted successfully:", result);
    } catch (error) {
        console.error("Error deleting image:", error);
    }

}

export{
    uploadOnCloudinary,
    deleteFromCloudinary
}