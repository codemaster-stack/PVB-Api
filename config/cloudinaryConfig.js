// // =================================
// // config/cloudinaryConfig.js (NEW FILE)
// // =================================
// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const multer = require('multer');

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });

// // Create Cloudinary storage
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: 'profile_pics', // Folder name in Cloudinary
//     allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
//     transformation: [
//       { width: 400, height: 400, crop: 'fill' }, // Auto resize/crop to 400x400
//       { quality: 'auto' } // Auto optimize quality
//     ],
//     public_id: (req, file) => {
//       // Create unique filename
//       const sanitizedName = file.originalname
//         .replace(/\s+/g, '_')
//         .replace(/[^a-zA-Z0-9._-]/g, '')
//         .toLowerCase();
//       return `${Date.now()}_${sanitizedName.split('.')[0]}`;
//     }
//   }
// });

// // File filter (same as before)
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only image files are allowed!"), false);
//   }
// };

// module.exports = multer({ storage, fileFilter });

// =================================
// config/cloudinaryConfig.js (COMPLETE UPDATE)
// =================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary (only once)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========== PROFILE PICTURES STORAGE ==========
const profilePicsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profile_pics',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const sanitizedName = file.originalname
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();
      return `${Date.now()}_${sanitizedName.split('.')[0]}`;
    }
  }
});

// ========== MARKETING SLIDES STORAGE ==========
const slidesStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'marketing_slides',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1920, height: 1080, crop: 'limit' },
      { quality: 'auto' }
    ],
    public_id: (req, file) => {
      const sanitizedName = file.originalname
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();
      return `slide_${Date.now()}_${sanitizedName.split('.')[0]}`;
    }
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// ✅ CREATE MULTER INSTANCES
const profileUpload = multer({ storage: profilePicsStorage, fileFilter });
const slideUpload = multer({ storage: slidesStorage, fileFilter });

// ✅ EXPORT EVERYTHING
module.exports = {
  cloudinary,
  profileUpload,  // For profile pictures
  slideUpload     // For marketing slides
};