// server.js
require("dotenv").config();
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db"); 
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const errorHandler = require("./middleware/errorHandler");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const publicLoanRoutes = require("./routes/publicLoanRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const cardRoutes = require('./routes/cardRoutes');
const adminCardRoutes = require('./routes/adminCardRoutes');

const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["https://bank.pvbonline.online", "https://valley.pvbonline.online"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/public/loans", publicLoanRoutes);
app.use("/api/transaction", transactionRoutes);
app.use('/api/user', cardRoutes);
app.use('/api/admin', adminCardRoutes);

// Keep static serving for frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// Error handler
app.use(errorHandler);

// --- Socket.IO setup ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [ "https://bank.pvbonline.online","https://valley.pvbonline.online"],

    methods: ["GET", "POST"],
    credentials: true,
  },
});

let visitors = {}; // socketId → metadata

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Visitor joins
  socket.on("joinVisitor", (visitorId) => {
    visitors[visitorId] = socket.id;
    console.log(`Visitor ${visitorId} connected with socket ${socket.id}`);
  });

  // Admin joins
  socket.on("joinAdmin", () => {
    socket.join("admins");
    console.log(`✅ Admin joined chat room with socket ${socket.id}`);
  });

  // Visitor sends message → broadcast to admins
  socket.on("visitorMessage", (data) => {
    io.to("admins").emit("chatMessage", { sender: "visitor", ...data });
  });

  // Admin sends message → send only to target visitor
  socket.on("adminMessage", ({ visitorId, text }) => {
    const visitorSocket = visitors[visitorId];
    if (visitorSocket) {
      io.to(visitorSocket).emit("chatMessage", { sender: "admin", text });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected", socket.id);
    for (const [id, sockId] of Object.entries(visitors)) {
      if (sockId === socket.id) {
        delete visitors[id];
        break;
      }
    }
  });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
