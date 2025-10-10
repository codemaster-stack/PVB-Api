const express = require("express");
const router = express.Router();
const { protectAdmin, protectSuperAdmin } = require("../middleware/adminMiddleware");
const upload = require('../config/cloudinaryConfig'); // Import new config


router.get("/dashboard", protectAdmin, (req, res) => {
  res.json({ message: `Welcome Admin ${req.admin.username}` });
});


const {
  registerAdmin,
  loginAdmin,
  forgotPassword,
  resetPassword,
  deleteUser,
  deactivateUser,
  fundUser,
  transferFunds,
  sendEmail,
  getAllUsers,
  updateUserProfile,
  getAllMessages,
  getAllLoans,
  getActiveUsers,
  reactivateUser,
  restoreUser,              // ADD THIS
  getDeletedUsers,          // ADD THIS
  permanentDeleteUser,      // ADD THIS
  getAllAdmins,             // ADD THIS
  deactivateAdmin,          // ADD THIS
  reactivateAdmin,          // ADD THIS
  deleteAdmin,
  getAllSentEmails,   
  fundAdminWallet,
  getAdminWallet, 
  createUser,               
  // updateUser,
  // resetUserPin,
} = require("../controllers/adminAuthController");
const { reviewLoanApplication } = require("../controllers/loanController");

// Public routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);
router.get("/messages", getAllMessages);
router.get("/loans",  getAllLoans);
router.post('/create-user', protectAdmin, createUser);
// Protected routes
router.get("/dashboard", protectAdmin, (req, res) => {
  res.json({ message: `Welcome Admin ${req.admin.username}` });
});

router.get("/users", protectAdmin, getAllUsers);

// New admin routes for dashboard
router.delete('/users/:email', protectAdmin, deleteUser);
router.put('/users/:email/deactivate', protectAdmin, deactivateUser);
router.put('/users/:email/reactivate', protectAdmin, reactivateUser);
router.post('/fund-user', protectAdmin, fundUser);
router.post('/transfer-funds', protectAdmin, transferFunds);
router.post('/send-email', protectAdmin, sendEmail);
router.put('/users/:email/profile', protectAdmin, upload.single('profilePic'), updateUserProfile);
router.get("/active-users", getActiveUsers);
router.get("/wallet", protectAdmin, getAdminWallet);
router.put("/review/:loanId", protectAdmin, reviewLoanApplication);

// ==================== SUPER ADMIN ONLY ROUTES ====================

// Recycle bin management
router.get('/recycle-bin/users', protectSuperAdmin, getDeletedUsers);
router.put('/recycle-bin/users/:email/restore', protectSuperAdmin, restoreUser);
router.delete('/recycle-bin/users/:email/permanent', protectSuperAdmin, permanentDeleteUser);

// Admin management
router.get('/admins', protectSuperAdmin, getAllAdmins);
router.delete('/admins/:email', protectSuperAdmin, deleteAdmin);
router.put('/admins/:email/deactivate', protectSuperAdmin, deactivateAdmin);
router.put('/admins/:email/reactivate', protectSuperAdmin, reactivateAdmin);
router.get('/sent-emails', protectSuperAdmin, getAllSentEmails);

router.post("/fund-wallet", protectSuperAdmin, fundAdminWallet);



router.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      email: "support@pvbonline.online",
      subject: "PVNBank Test Email",
      message: "If you received this, your Zoho email setup works perfectly ✅"
    });
    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Email failed" });
  }
});



module.exports = router;


// router.put("/users/:id", protectAdmin, upload.single("photo"), updateUser);
// router.post("/users/:id/reset-pin", protectAdmin, resetUserPin);
// router.delete("/users/:id", protectAdmin, deleteUser);
// router.post("/users/:id/fund", protectAdmin, fundUser);