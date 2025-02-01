// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error Not Able to Connect: ",error);
        throw error;
    })
    app.listen(process.env.PORT || 3000, ()=>{
        console.log(`Server Started at Port ${process.env.PORT}`);
    });
}) 
.catch((err)=>{
    console.log("MongoDB Connection Failed: ",err);
})
