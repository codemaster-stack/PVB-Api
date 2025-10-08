// server.js
require("dotenv").config();
const express = require("express");
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
const ChatMessage = require("./models/ChatMessage");
const chatRoutes = require("./routes/chatRoutes");

const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

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
app.use("/api/chat", chatRoutes);
// Keep static serving for frontend files
app.use(express.static(path.join(__dirname, "frontend")));

// Error handler
app.use(errorHandler);

// --- Socket.IO setup ---
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://bank.pvbonline.online", "https://valley.pvbonline.online"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let visitors = {}; // socketId → metadata
let socketToVisitor = {};

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);


  socket.on("joinVisitor", (visitorId) => {
  visitors[visitorId] = socket.id;
  socketToVisitor[socket.id] = visitorId; // ADD THIS LINE
  console.log(`Visitor ${visitorId} connected with socket ${socket.id}`);
});

  // Admin joins
  socket.on("joinAdmin", () => {
    socket.join("admins");
    console.log(`✅ Admin joined chat room with socket ${socket.id}`);
  });

  // Visitor sends message → broadcast to admins
  // socket.on("visitorMessage", (data) => {
  //   console.log("📨 Visitor message received:", data);
  //   // Send to admins with proper format
  //   io.to("admins").emit("chatMessage", { 
  //     sender: "visitor", 
  //     visitorId: data.visitorId,
  //     text: data.text 
  //   });
  // });
  socket.on("visitorMessage", async (data) => {
    console.log("📨 Visitor message received:", data);
    
    // Save to database
    try {
      await ChatMessage.create({
        sender: "user",
        senderEmail: data.visitorId || "anonymous",
        senderName: data.visitorName || "Visitor",
        receiverEmail: "admin",
        message: data.text
      });
    } catch (error) {
      console.error("Error saving visitor message:", error);
    }
    
    // Send to admins with proper format
    io.to("admins").emit("chatMessage", { 
      sender: "visitor", 
      visitorId: data.visitorId,
      text: data.text 
    });
  });

  // Admin sends message → send only to target visitor
  // socket.on("adminMessage", ({ visitorId, text }) => {
  //   const visitorSocket = visitors[visitorId];
  //   if (visitorSocket) {
  //     io.to(visitorSocket).emit("chatMessage", { sender: "admin", text });
  //   }
  // });
socket.on("adminMessage", async ({ visitorId, text, adminEmail, adminName }) => {
    const visitorSocket = visitors[visitorId];
    
    // Save to database
    try {
      await ChatMessage.create({
        sender: "admin",
        senderEmail: adminEmail || "admin@pvbonline.online",
        senderName: adminName || "Admin",
        receiverEmail: visitorId || "visitor",
        message: text
      });
    } catch (error) {
      console.error("Error saving admin message:", error);
    }
    
    if (visitorSocket) {
      io.to(visitorSocket).emit("chatMessage", { sender: "admin", text });
    }
  });

  // ✨ NEW: Admin typing notification
  socket.on("adminTyping", (data) => {
    const visitorSocket = visitors[data.visitorId];
    if (visitorSocket) {
      io.to(visitorSocket).emit("adminTyping", { 
        typing: data.typing 
      });
      console.log(`👨‍💼 Admin typing to ${data.visitorId}: ${data.typing}`);
    }
  });

 

  socket.on("visitorTyping", (data) => {
  const visitorId = socketToVisitor[socket.id]; // Get custom visitorId
  console.log(`👤 Visitor ${visitorId} (socket: ${socket.id}) typing:`, data.typing);
  // Send typing status to all admins with the custom visitorId
  io.to("admins").emit("visitorTyping", { 
    visitorId: visitorId, // Use custom visitorId
    typing: data.typing 
  });
});


socket.on("disconnect", () => {
  console.log("❌ Client disconnected", socket.id);
  const visitorId = socketToVisitor[socket.id];
  if (visitorId) {
    delete visitors[visitorId];
    delete socketToVisitor[socket.id];
  }
});
});
// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));