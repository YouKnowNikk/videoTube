import fs from 'fs'
import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath){
            return null
        }
        const resp = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        return resp;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}
const deleteFromCloudinary = async (avatarUrl) => {
    try {
        const publicIdMatch = avatarUrl.match(/\/([^\/]+?)(\.[^.]+)?$/);
        const publicId = publicIdMatch ? String(publicIdMatch[1]) : null;
      const result = await cloudinary.uploader.destroy(publicId);
  
      if (result.result === 'ok') {
        console.log(`Deleted avatar file from Cloudinary`);
      } else {
        console.error(`Error deleting avatar file from Cloudinary`);
      }
    } catch (error) {
      console.error('Error deleting avatar file from Cloudinary:', error.message);
    }
  };
export{uploadOnCloudinary,deleteFromCloudinary}