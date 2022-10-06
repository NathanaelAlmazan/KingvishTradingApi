import cloudinary from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const cloud = cloudinary.v2

cloud.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})

const params = {
    folder: 'inventory',
    format: (req: unknown, file: Express.Multer.File) => {
        const extArray = file.mimetype.split("/")
        return extArray[extArray.length - 1]
    },
    public_id: (req: unknown, file: Express.Multer.File) => file.originalname.split(".")[0]
}

const cloudStorage = new CloudinaryStorage({
    cloudinary: cloud,
    params: params
})

const parser = multer({ storage: cloudStorage });

export default parser