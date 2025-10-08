// middleware/adminMiddleware.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Received token:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      const admin = await Admin.findById(decoded.id).select("-password");
      
      if (!admin) {
        console.log("Admin not found in database for ID:", decoded.id);
        return res.status(401).json({ message: "Not authorized as admin" });
      }

      // Attach admin to BOTH req.admin AND req.user
      req.admin = admin;
      req.user = admin;  // ADD THIS LINE
      
      console.log("Found admin:", !!req.admin);

      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    console.log("No authorization header found");
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Add this AFTER the protectAdmin function, BEFORE module.exports
const protectSuperAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.admin = await Admin.findById(decoded.id).select("-password");
      
      if (!req.admin) {
        return res.status(401).json({ message: "Not authorized" });
      }

      // Check if admin has superadmin role
      if (req.admin.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied. Super admin only." });
      }

      next();
    } catch (error) {
      console.error("Token verification error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
module.exports = { protectAdmin, protectSuperAdmin };
