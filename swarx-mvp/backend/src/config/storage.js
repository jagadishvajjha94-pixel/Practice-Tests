import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const useCloudinary = process.env.USE_CLOUDINARY === "true";

let storage;

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "swarx-submissions",
      resource_type: "auto",
    },
  });
} else {
  storage = multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
    },
  });
}

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "video/mp4",
      "video/webm",
      "audio/webm",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const getUploadedFileUrl = (file) => {
  if (!file) return "";
  if (file.path?.startsWith("http")) return file.path;
  return `/uploads/${path.basename(file.path)}`;
};
