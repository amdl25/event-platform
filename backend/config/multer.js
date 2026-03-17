import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

cloudinary.config();

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Te rog încarcă doar imagini!'), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 };

const diskUpload = multer({ storage: diskStorage, fileFilter, limits }).single('image');
const memoryUpload = multer({ storage: memoryStorage, fileFilter, limits }).single('image');

const uploadMiddleware = (req, res, next) => {
  const useCloudinary = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

  if (useCloudinary) {
    memoryUpload(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      try {
        const streamUpload = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: process.env.CLOUDINARY_FOLDER || 'event-platform' },
              (error, result) => {
                if (result) resolve(result);
                else reject(error);
              }
            );
            streamifier.createReadStream(buffer).pipe(stream);
          });
        };

        const result = await streamUpload(req.file.buffer);
        req.file = {
          filename: result.public_id,
          url: result.secure_url,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
        next();
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  } else {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    diskUpload(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
};

export default uploadMiddleware;