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
const mktSlideRoutes = require('./routes/mktSlideRoutes');
const Admin = require("./models/Admin"); // Add this import
const { sendEmail } = require("./utils/sendEmail");

async function notifyAdminsAboutNewChat(visitorEmail, visitorName, messageText) {
  try {
    // Get all active admins
    const admins = await Admin.find({ isActive: true });
    
    if (admins.length === 0) {
      console.log("⚠️ No active admins to notify");
      return;
    }
    
    // Send email to each admin
    const emailPromises = admins.map(admin => {
      return sendEmail({
        email: admin.email,
        subject: `🔔 New Chat Message from ${visitorName || visitorEmail}`,
        message: `A user has sent a new chat message.`,
        html: `
          <div style="max-width:600px; margin:auto; padding:20px; font-family:Arial, sans-serif; border:1px solid #eaeaea; border-radius:10px;">
            <h2 style="color:#004080; text-align:center;">🔔 New Chat Message</h2>
            <p style="font-size:15px; color:#333;">Hello ${admin.username},</p>
            <p style="font-size:15px; color:#555; line-height:1.6;">
              A user has just sent a chat message and may need assistance.
            </p>
            <div style="background:#f5f5f5; padding:15px; border-radius:5px; margin:20px 0;">
              <p style="margin:5px 0;"><strong>From:</strong> ${visitorName || "Visitor"}</p>
              <p style="margin:5px 0;"><strong>Email:</strong> ${visitorEmail}</p>
              <p style="margin:5px 0;"><strong>Message:</strong> ${messageText}</p>
            </div>
            <p style="font-size:15px; color:#555;">
              Please log in to your admin panel to respond.
            </p>
            <p style="font-size:13px; color:#777; text-align:center; margin-top:20px;">
              © ${new Date().getFullYear()} PVNBank. Automated notification.
            </p>
          </div>
        `
      }).catch(err => {
        console.error(`Failed to send notification to ${admin.email}:`, err.message);
      });
    });
    
    await Promise.all(emailPromises);
    console.log(`✅ Notified ${admins.length} admin(s) about new chat from ${visitorEmail}`);
    
  } catch (error) {
    console.error("❌ Error notifying admins:", error);
  }
}

const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' })); // ✅ Increased limit for file uploads
app.use(express.urlencoded({ limit: '10mb', extended: true })); // ✅ Added for file handling
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
app.use('/api', mktSlideRoutes);
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
  maxHttpBufferSize: 10e6 // ✅ 10MB limit for socket messages (for file uploads)
});

let visitors = {}; // socketId → metadata
let socketToVisitor = {};

// ✅ Helper function to validate file size
function validateFileSize(base64Data, maxSizeMB = 5) {
  try {
    const sizeInBytes = (base64Data.length * 3) / 4 - 
      (base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0);
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return sizeInMB <= maxSizeMB;
  } catch (error) {
    return false;
  }
}

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // Visitor joins
  // socket.on("joinVisitor", (visitorId) => {
  //   visitors[visitorId] = socket.id;
  //   socketToVisitor[socket.id] = visitorId;
  //   console.log(`Visitor ${visitorId} connected with socket ${socket.id}`);
  // });
  // Visitor joins
  socket.on("joinVisitor", async (visitorId) => {
  visitors[visitorId] = socket.id;
  socketToVisitor[socket.id] = visitorId;
  console.log(`Visitor ${visitorId} connected with socket ${socket.id}`);
  
  // ✅ Load chat history for this visitor
  try {
    const messages = await ChatMessage.find({
      $or: [
        { senderEmail: visitorId, sender: "user" },
        { receiverEmail: visitorId, sender: "admin" }
      ]
    })
    .sort({ createdAt: 1 })
    .limit(50); // Last 50 messages
    
    if (messages.length > 0) {
      // Send history to this specific visitor
      socket.emit("loadPreviousMessages", messages.map(msg => ({
        sender: msg.sender,
        senderName: msg.senderName,
        text: msg.message,
        isFile: msg.isFile || false,
        fileName: msg.fileName,
        fileType: msg.fileType,
        fileData: msg.fileData,
        timestamp: msg.createdAt
      })));
      console.log(`📚 Sent ${messages.length} previous messages to ${visitorId}`);
    }
  } catch (error) {
    console.error("Error loading visitor history:", error);
  }
});

  // Admin joins
  // socket.on("joinAdmin", () => {
  //   socket.join("admins");
  //   console.log(`✅ Admin joined chat room with socket ${socket.id}`);
  // });
      // Admin joins
socket.on("joinAdmin", async () => {
  socket.join("admins");
  console.log(`✅ Admin joined chat room with socket ${socket.id}`);
  
  // ✅ Automatically send all chat history to admin
  try {
    const messages = await ChatMessage.find()
      .sort({ createdAt: 1 })
      .limit(100);
    
    // Group by visitor
    const history = {};
    messages.forEach(msg => {
      const visitorId = msg.sender === "user" ? msg.senderEmail : msg.receiverEmail;
      
      if (!history[visitorId]) {
        history[visitorId] = [];
      }
      
      history[visitorId].push({
        sender: msg.sender,
        from: msg.senderName || msg.sender,
        text: msg.message,
        message: msg.message,
        isFile: msg.isFile || false,
        fileName: msg.fileName,
        fileType: msg.fileType,
        fileData: msg.fileData,
        timestamp: msg.createdAt || msg.timestamp
      });
    });
    
    socket.emit("chatHistory", history);
    console.log("📚 Automatically loaded chat history for admin");
  } catch (error) {
    console.error("Error auto-loading admin history:", error);
  }
});


  // Visitor sends text message
  // socket.on("visitorMessage", async (data) => {
  //   console.log("📨 Visitor message received:", data);
    
  //   // Save to database
  //   try {
  //     await ChatMessage.create({
  //       sender: "user",
  //       senderEmail: data.visitorId || "anonymous",
  //       senderName: data.visitorName || "Visitor",
  //       receiverEmail: "admin",
  //       message: data.text
  //     });
  //   } catch (error) {
  //     console.error("Error saving visitor message:", error);
  //   }
    
  //   // Send to admins with proper format
  //   io.to("admins").emit("chatMessage", { 
  //     sender: "visitor", 
  //     visitorId: data.visitorId,
  //     text: data.text 
  //   });
  // });
  // Visitor sends text message
socket.on("visitorMessage", async (data) => {
  console.log("📨 Visitor message received:", data);
  
  // Save to database
  try {
    const newMessage = await ChatMessage.create({
      sender: "user",
      senderEmail: data.visitorId || "anonymous",
      senderName: data.visitorName || "Visitor",
      receiverEmail: "admin",
      message: data.text
    });
    
    // ✅ Check if this is the first message from this user
    const messageCount = await ChatMessage.countDocuments({
      senderEmail: data.visitorId || "anonymous",
      sender: "user"
    });
    
    // ✅ If first message, notify ALL admins
    if (messageCount === 1) {
      console.log("🔔 First message from user, notifying all admins...");
      await notifyAdminsAboutNewChat(
        data.visitorId || "anonymous",
        data.visitorName || "Visitor",
        data.text
      );
    }
    
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

  // ✅ NEW: Visitor sends file message
  socket.on("visitorFileMessage", async (data) => {
    console.log("📎 Visitor file received:", data.fileName);
    
    // Validate file size
    if (!validateFileSize(data.fileData, 5)) {
      socket.emit("fileError", { message: "File size exceeds 5MB limit" });
      console.log("❌ File too large");
      return;
    }
    
    try {
      // Save file message to database
      await ChatMessage.create({
        sender: "user",
        senderEmail: data.visitorId || "anonymous",
        senderName: "Visitor",
        receiverEmail: "admin",
        message: data.caption || `Sent a file: ${data.fileName}`,
        fileData: data.fileData,
        fileName: data.fileName,
        fileType: data.fileType,
        isFile: true
      });
      
      // Forward to all admins
      io.to("admins").emit("visitorFileMessage", {
        visitorId: data.visitorId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileData: data.fileData,
        caption: data.caption,
        timestamp: data.timestamp
      });
      
      console.log("✅ File message forwarded to admins");
    } catch (error) {
      console.error("❌ Error handling visitor file:", error);
      socket.emit("fileError", { message: "Failed to send file" });
    }
  });

  // Admin sends text message
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

  // ✅ NEW: Admin sends file message
  socket.on("adminFileMessage", async (data) => {
    console.log("📎 Admin file received:", data.fileName);
    
    // Validate file size
    if (!validateFileSize(data.fileData, 5)) {
      socket.emit("fileError", { message: "File size exceeds 5MB limit" });
      console.log("❌ File too large");
      return;
    }
    
    try {
      const visitorSocket = visitors[data.visitorId];
      
      // Save file message to database
      await ChatMessage.create({
        sender: "admin",
        senderEmail: "admin@pvbonline.online",
        senderName: "Support",
        receiverEmail: data.visitorId || "visitor",
        message: data.caption || `Sent a file: ${data.fileName}`,
        fileData: data.fileData,
        fileName: data.fileName,
        fileType: data.fileType,
        isFile: true
      });
      
      // Forward to specific visitor
      if (visitorSocket) {
        io.to(visitorSocket).emit("adminFileMessage", {
          fileName: data.fileName,
          fileType: data.fileType,
          fileData: data.fileData,
          caption: data.caption,
          timestamp: data.timestamp
        });
        console.log(`✅ File sent to visitor ${data.visitorId}`);
      } else {
        console.log(`⚠️ Visitor ${data.visitorId} not connected`);
      }
    } catch (error) {
      console.error("❌ Error handling admin file:", error);
      socket.emit("fileError", { message: "Failed to send file" });
    }
  });

  // Admin typing notification
  socket.on("adminTyping", (data) => {
    const visitorSocket = visitors[data.visitorId];
    if (visitorSocket) {
      io.to(visitorSocket).emit("adminTyping", { 
        typing: data.typing 
      });
      console.log(`👨‍💼 Admin typing to ${data.visitorId}: ${data.typing}`);
    }
  });

  // Visitor typing notification
  socket.on("visitorTyping", (data) => {
    const visitorId = socketToVisitor[socket.id];
    console.log(`👤 Visitor ${visitorId} (socket: ${socket.id}) typing:`, data.typing);
    // Send typing status to all admins with the custom visitorId
    io.to("admins").emit("visitorTyping", { 
      visitorId: visitorId,
      typing: data.typing 
    });
  });

  // ✅ NEW: Request chat history (with files)
  socket.on("requestChatHistory", async () => {
    try {
      // Get all chat messages from database
      const messages = await ChatMessage.find()
        .sort({ createdAt: 1 })
        .limit(100); // Last 100 messages
      
      // Group by visitor
      const history = {};
      messages.forEach(msg => {
        const visitorId = msg.sender === "user" ? msg.senderEmail : msg.receiverEmail;
        
        if (!history[visitorId]) {
          history[visitorId] = [];
        }
        
        history[visitorId].push({
          sender: msg.sender,
          from: msg.senderName || msg.sender,
          text: msg.message,
          message: msg.message,
          // Include file data if present
          isFile: msg.isFile || false,
          fileName: msg.fileName,
          fileType: msg.fileType,
          fileData: msg.fileData,
          timestamp: msg.createdAt || msg.timestamp
        });
      });
      
      socket.emit("chatHistory", history);
      console.log("📚 Sent chat history to admin");
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  });

  // Client disconnects
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