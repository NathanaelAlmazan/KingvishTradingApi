"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = __importDefault(require("cloudinary"));
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloud = cloudinary_1.default.v2;
cloud.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});
const params = {
    folder: 'inventory',
    format: (req, file) => {
        const extArray = file.mimetype.split("/");
        return extArray[extArray.length - 1];
    },
    public_id: (req, file) => file.originalname.split(".")[0]
};
const cloudStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloud,
    params: params
});
const parser = (0, multer_1.default)({ storage: cloudStorage });
exports.default = parser;
//# sourceMappingURL=index.js.map