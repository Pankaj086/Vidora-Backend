import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async() => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB coonected!! DB host: ${connectionInstance.connection.host}`);
    } catch(error){
        console.log("Error MongoDB Connection: ",error);
        process.exit(1)
    }
}

export default connectDB;