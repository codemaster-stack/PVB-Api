const express = require("express");
const upload = require('../config/cloudinaryConfig'); // Import new config
const router = express.Router();
const { protect } = require("../middleware/auth");

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getDashboard,
  getTransactions,
  updateProfilePicture,
  getMe,
  checkPinStatus,
} = require("../controllers/userController");



// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

// Protected routes
router.use(protect);

// router.post("/create-card", createCreditCard);
router.get("/dashboard", getDashboard);
router.get("/transactions", protect, getTransactions);


router.get('/check-pin-status', protect, checkPinStatus);

// User info & profile picture
router.get("/me", getMe);
// router.put("/profile-picture", upload.single("profilePic"), updateProfilePicture);
router.put('/profile-picture', protect, upload.single('profilePic'), updateProfilePicture);



// Add this route for debugging
router.get('/verify-profile-pic/:filename', protect, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/profiles', filename);
  const fs = require('fs');
  
  res.json({
    filename,
    fullPath: filePath,
    exists: fs.existsSync(filePath),
    serverTime: new Date().toISOString()
  });
});


module.exports = router;


// FIX: remove extra `/users` prefix
// router.get("/has-pin", hasPin);
// router.post("/create-pin", createPin);
// router.post("/forgot-pin", forgotPin);
// router.post("/reset-pin", resetPin);


// Multer setup
// const uploadPath = "./uploads/profiles";
// if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadPath),
//   filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
// });
// const upload = multer({ storage });