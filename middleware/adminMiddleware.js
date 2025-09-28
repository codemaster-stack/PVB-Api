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

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);

      // Attach admin to request object (excluding password)
      req.admin = await Admin.findById(decoded.id).select("-password");
      console.log("Found admin:", !!req.admin);

      if (!req.admin) {
        console.log("Admin not found in database for ID:", decoded.id);
        return res.status(401).json({ message: "Not authorized as admin" });
      }

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
module.exports = { protectAdmin };
