import multer from 'multer';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Te rog încarcă doar imagini!'), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 };
const memoryUpload = multer({ storage: memoryStorage, fileFilter, limits }).single('image');

const buildCloudinaryUploadError = (uploadErr) => {
  const rawMessage = uploadErr?.message || 'Eroare necunoscută la încărcarea imaginii.';

  if (/invalid signature/i.test(rawMessage)) {
    return new Error('Cloudinary API secret este greșit sau lipsește. Actualizează CLOUDINARY_API_SECRET în backend/.env.');
  }

  if (/api_key/i.test(rawMessage)) {
    return new Error('Cloudinary API key lipsește sau nu este valid. Verifică CLOUDINARY_API_KEY și CLOUDINARY_CLOUD_NAME.');
  }

  return uploadErr instanceof Error ? uploadErr : new Error(rawMessage);
};

const uploadMiddleware = (req, res, next) => {
  const useCloudinary = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);

  if (!useCloudinary) {
    return res.status(500).json({ message: 'Cloudinary nu este configurat. Setează CLOUDINARY_URL sau CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.' });
  }

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
      next(buildCloudinaryUploadError(uploadErr));
    }
  });
};

export default uploadMiddleware;