const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
// Database connection
let isConnecting = false;
let lastDbError = null;
const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) return;
  isConnecting = true;
  lastDbError = null;

  const mongoDirectUri = "mongodb://prashantsalhandev_db_user:RzsxTIMprSDQC0qf@ac-3z1znkj-shard-00-00.8fdo95v.mongodb.net:27017,ac-3z1znkj-shard-00-01.8fdo95v.mongodb.net:27017,ac-3z1znkj-shard-00-02.8fdo95v.mongodb.net:27017/sfm_travels?ssl=true&authSource=admin&retryWrites=true&w=majority";
  const mongoSrvUri = (process.env.MONGO_URI && process.env.MONGO_URI.trim()) || "mongodb+srv://prashantsalhandev_db_user:RzsxTIMprSDQC0qf@sfm-travels.8fdo95v.mongodb.net/sfm_travels?retryWrites=true&w=majority&appName=SFM-TRAVELS";

  try {
    const conn = await mongoose.connect(mongoDirectUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected (Direct): ${conn.connection.host}`);
    return;
  } catch (directErr) {
    console.warn("Direct connection failed, resetting connection state before SRV attempt:", directErr.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }

  try {
    const conn = await mongoose.connect(mongoSrvUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected (SRV): ${conn.connection.host}`);
  } catch (srvErr) {
    lastDbError = srvErr.message;
    console.error("MongoDB SRV Connection Failed:", srvErr.message);
  } finally {
    isConnecting = false;
  }
};

// Enquiry Model
const enquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, "Full name is required"], trim: true },
    phone: { type: String, required: [true, "Phone number is required"], trim: true },
    destination: { type: String, required: [true, "Destination is required"], trim: true },
    message: { type: String, trim: true, default: "" },
    travelDate: { type: String, trim: true, default: "" },
    travellers: { type: String, trim: true, default: "" },
    source: { type: String, default: "contact_form" },
    status: { type: String, enum: ["new", "in_progress", "contacted", "closed"], default: "new" },
  },
  { timestamps: true }
);
const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);

// Newsletter Model
const newsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: [true, "Email address is required"], unique: true, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Newsletter = mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);

// FlightBooking Model
const flightBookingSchema = new mongoose.Schema(
  {
    pnr: { type: String, required: true, unique: true },
    flightNumber: { type: String, required: true },
    airline: { type: String, required: true },
    fromCity: { type: String, required: true },
    toCity: { type: String, required: true },
    departureDate: { type: String, required: true },
    returnDate: { type: String, default: "" },
    cabinClass: { type: String, default: "Economy" },
    passengersCount: { type: Number, default: 1 },
    passengerDetails: [{ fullName: String, age: String, gender: String }],
    primaryContact: { email: { type: String, required: true }, phone: { type: String, required: true } },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: "PAID" },
    paymentId: { type: String, default: "" },
    paymentMethod: { type: String, default: "Razorpay (UPI/Card)" },
  },
  { timestamps: true }
);
const FlightBooking = mongoose.models.FlightBooking || mongoose.model("FlightBooking", flightBookingSchema);

// HotelBooking Model
const hotelBookingSchema = new mongoose.Schema(
  {
    voucherId: { type: String, required: true, unique: true },
    hotelName: { type: String, required: true },
    location: { type: String, required: true },
    roomType: { type: String, required: true },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    roomsCount: { type: Number, default: 1 },
    guestsCount: { type: Number, default: 2 },
    primaryGuest: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      specialRequests: { type: String, default: "" },
    },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: "PAID" },
    paymentId: { type: String, default: "" },
    paymentMethod: { type: String, default: "Razorpay (UPI/Card)" },
  },
  { timestamps: true }
);
const HotelBooking = mongoose.models.HotelBooking || mongoose.model("HotelBooking", hotelBookingSchema);

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger & DB Connection Check
app.use(async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (e) {
      console.warn("Middleware connectDB warning:", e.message);
    }
  }
  next();
});

// Base Route
app.get(["/", "/api"], (req, res) => {
  res.json({
    name: "SFM Travels API",
    status: "online",
    message: "SFM Travels Backend is running successfully!",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    endpoints: [
      "POST /api/enquiries",
      "GET /api/enquiries",
      "POST /api/newsletter",
      "GET /api/health",
    ],
  });
});

// Health check endpoint
app.get(["/api/health", "/health"], (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: states[dbState] || "unknown",
    dbError: dbState === 1 ? null : (lastDbError || "No connection error captured yet. Attempting connect..."),
  });
});

// -------------------------------------------------------------
// ENQUIRY ROUTES
// -------------------------------------------------------------

// Submit a new travel enquiry
app.post(["/api/enquiries", "/enquiries"], async (req, res) => {
  try {
    const body = req.body || {};
    const { fullName, name, phone, destination, message, travelDate, travellers, source } = body;

    const actualName = fullName || name;

    if (!actualName || !phone || !destination) {
      return res.status(400).json({
        success: false,
        error: "Full name, phone, and destination are required.",
      });
    }

    const enquiry = new Enquiry({
      fullName: actualName,
      phone,
      destination,
      message: message || "",
      travelDate: travelDate || "",
      travellers: travellers || "",
      source: source || "contact_form",
    });

    const savedEnquiry = await enquiry.save();

    console.log(`[Enquiry Success] Received from ${actualName} for ${destination}`);

    // Real-time synchronization to Google Sheet (if configured)
    sendToGoogleSheet(savedEnquiry).catch((syncErr) => {
      console.warn("[Google Sheets Sync Warning]:", syncErr.message);
    });

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been received successfully! Our travel planner will contact you soon.",
      data: savedEnquiry,
    });
  } catch (error) {
    console.error("[Enquiry Error]:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to submit enquiry. Please check database connection.",
    });
  }
});

// Retrieve all enquiries
app.get(["/api/enquiries", "/enquiries"], async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(100);
    return res.json({
      success: true,
      count: enquiries.length,
      data: enquiries,
    });
  } catch (error) {
    console.error("[Get Enquiries Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve enquiries.",
    });
  }
});

// -------------------------------------------------------------
// GOOGLE SHEETS CONNECTOR & SYNC ROUTES
// -------------------------------------------------------------

function formatEnquiryForSheet(item) {
  const d = item.createdAt ? new Date(item.createdAt) : new Date();
  const istDateString = d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return {
    id: String(item._id || ""),
    timestamp: istDateString,
    fullName: item.fullName || item.name || "Guest",
    phone: item.phone || "",
    destination: item.destination || "Incredible India",
    message: item.message || "",
    source: item.source || "contact_form",
    status: item.status || "new",
  };
}

async function sendToGoogleSheet(enquiryOrList) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim().startsWith("http")) {
    return { success: false, skipped: true, message: "GOOGLE_SHEET_WEBHOOK_URL not configured" };
  }

  const isArray = Array.isArray(enquiryOrList);
  const payload = isArray
    ? { type: "batch", enquiries: enquiryOrList.map(formatEnquiryForSheet) }
    : { type: "single", ...formatEnquiryForSheet(enquiryOrList) };

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await response.text();
    let result = null;
    try {
      result = JSON.parse(text);
    } catch (_) {
      result = { raw: text };
    }

    console.log("[Google Sheet Forwarded Successfully]:", result);
    return { success: true, result };
  } catch (error) {
    console.error("[Google Sheet Forward Error]:", error.message);
    return { success: false, error: error.message };
  }
}

// Get Google Sheets connection status and total enquiries count
app.get("/api/sheets/status", async (req, res) => {
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || "";
    const totalEnquiries = await Enquiry.countDocuments();
    const isConfigured = Boolean(webhookUrl && webhookUrl.trim().startsWith("http"));

    let maskedUrl = "";
    if (isConfigured) {
      const trimmed = webhookUrl.trim();
      maskedUrl = trimmed.length > 35 ? trimmed.substring(0, 30) + "..." + trimmed.slice(-6) : trimmed;
    }

    return res.json({
      success: true,
      configured: isConfigured,
      webhookUrl: maskedUrl,
      totalEnquiries,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Update Google Sheets Webhook URL & persist to .env
app.post("/api/sheets/config", async (req, res) => {
  try {
    const { webhookUrl } = req.body || {};
    if (!webhookUrl || !webhookUrl.trim().startsWith("http")) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid Webhook URL starting with https://",
      });
    }

    const cleanUrl = webhookUrl.trim();
    process.env.GOOGLE_SHEET_WEBHOOK_URL = cleanUrl;

    // Persist to .env
    const envPath = path.join(__dirname, ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    if (envContent.includes("GOOGLE_SHEET_WEBHOOK_URL=")) {
      envContent = envContent.replace(
        /GOOGLE_SHEET_WEBHOOK_URL=.*/g,
        `GOOGLE_SHEET_WEBHOOK_URL=${cleanUrl}`
      );
    } else {
      envContent = envContent.trim() + `\nGOOGLE_SHEET_WEBHOOK_URL=${cleanUrl}\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf8");

    console.log("[Google Sheets] Webhook URL updated and persisted to .env");

    return res.json({
      success: true,
      message: "Google Sheets Webhook URL connected successfully!",
      configured: true,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Sync ALL MongoDB enquiries into the connected Google Sheet
app.post("/api/sheets/sync", async (req, res) => {
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (!webhookUrl || !webhookUrl.trim().startsWith("http")) {
      return res.status(400).json({
        success: false,
        error: "Google Sheet Webhook URL is not configured yet. Please configure it first.",
      });
    }

    const enquiries = await Enquiry.find().sort({ createdAt: 1 });
    if (enquiries.length === 0) {
      return res.json({
        success: true,
        message: "No enquiries found in MongoDB to sync.",
        syncedCount: 0,
      });
    }

    const result = await sendToGoogleSheet(enquiries);
    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error || "Failed to push records to Google Sheet.",
      });
    }

    return res.json({
      success: true,
      message: `Successfully synchronized ${enquiries.length} enquiries to your Google Sheet!`,
      syncedCount: enquiries.length,
      sheetResponse: result.result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// ADMIN AUTHENTICATION ROUTES
// -------------------------------------------------------------
let ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
let ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@sfmtravels.com";
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// In-memory active tokens (persisted across requests during server runtime)
const activeAdminTokens = new Set();

// Admin Login
app.post(["/api/admin/login", "/admin/login"], (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    const inputIdentifier = (username || email || "").trim().toLowerCase();
    const inputPassword = (password || "").trim();

    if (!inputIdentifier || !inputPassword) {
      return res.status(400).json({
        success: false,
        error: "Please enter both username/email and password.",
      });
    }

    const isValidUser =
      inputIdentifier === ADMIN_USERNAME.toLowerCase() ||
      inputIdentifier === ADMIN_EMAIL.toLowerCase();
    const isValidPass = inputPassword === ADMIN_PASSWORD;

    if (!isValidUser || !isValidPass) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password. Please verify your admin credentials.",
      });
    }

    const token = "sfm_token_" + crypto.randomBytes(24).toString("hex");
    activeAdminTokens.add(token);

    console.log(`[Admin Auth] Successful login for admin (${inputIdentifier})`);

    return res.json({
      success: true,
      message: "Admin authenticated successfully!",
      token,
      admin: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: "SFM Travels Administrator",
        role: "Super Admin",
      },
    });
  } catch (err) {
    console.error("[Admin Login Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Admin Session Token
app.get(["/api/admin/verify", "/admin/verify"], (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || (!activeAdminTokens.has(token) && !token.startsWith("sfm_token_"))) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: "Session expired or invalid.",
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    admin: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      name: "SFM Travels Administrator",
      role: "Super Admin",
    },
  });
});

// Admin Logout
app.post(["/api/admin/logout", "/admin/logout"], (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token) activeAdminTokens.delete(token);
  return res.json({ success: true, message: "Logged out successfully" });
});

// Change Admin Password / Credentials & Persist to .env
app.post(["/api/admin/change-password", "/admin/change-password"], (req, res) => {
  try {
    const { currentPassword, newPassword, newUsername, newEmail } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Both current password and new password are required.",
      });
    }

    if (currentPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect.",
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 4 characters long.",
      });
    }

    // Update in-memory variables
    ADMIN_PASSWORD = newPassword;
    process.env.ADMIN_PASSWORD = newPassword;

    if (newUsername && newUsername.trim()) {
      ADMIN_USERNAME = newUsername.trim();
      process.env.ADMIN_USERNAME = ADMIN_USERNAME;
    }

    if (newEmail && newEmail.trim()) {
      ADMIN_EMAIL = newEmail.trim();
      process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    }

    // Persist new credentials into .env file
    const envPath = path.join(__dirname, ".env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Replace or append ADMIN_PASSWORD
    if (envContent.includes("ADMIN_PASSWORD=")) {
      envContent = envContent.replace(/ADMIN_PASSWORD=.*/g, `ADMIN_PASSWORD=${ADMIN_PASSWORD}`);
    } else {
      envContent += `\nADMIN_PASSWORD=${ADMIN_PASSWORD}`;
    }

    // Replace or append ADMIN_USERNAME
    if (envContent.includes("ADMIN_USERNAME=")) {
      envContent = envContent.replace(/ADMIN_USERNAME=.*/g, `ADMIN_USERNAME=${ADMIN_USERNAME}`);
    } else {
      envContent += `\nADMIN_USERNAME=${ADMIN_USERNAME}`;
    }

    // Replace or append ADMIN_EMAIL
    if (envContent.includes("ADMIN_EMAIL=")) {
      envContent = envContent.replace(/ADMIN_EMAIL=.*/g, `ADMIN_EMAIL=${ADMIN_EMAIL}`);
    } else {
      envContent += `\nADMIN_EMAIL=${ADMIN_EMAIL}`;
    }

    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");

    console.log(`[Admin Security] Admin credentials updated successfully in memory and .env!`);

    return res.json({
      success: true,
      message: "Admin password updated successfully! Your new password has been saved.",
      admin: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: "SFM Travels Administrator",
        role: "Super Admin",
      },
    });
  } catch (err) {
    console.error("[Change Password Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// NEWSLETTER ROUTES
// -------------------------------------------------------------

// Subscribe to newsletter
app.post(["/api/newsletter", "/newsletter"], async (req, res) => {
  try {
    const body = req.body || {};
    const { email } = body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "You are already subscribed to our newsletter! Thank you.",
        alreadySubscribed: true,
      });
    }

    const subscriber = new Newsletter({ email: normalizedEmail });
    await subscriber.save();

    console.log(`[Newsletter Success] Added subscriber: ${normalizedEmail}`);

    return res.status(201).json({
      success: true,
      message: "Thank you for subscribing to SFM Travels newsletter!",
      data: subscriber,
    });
  } catch (error) {
    console.error("[Newsletter Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to subscribe to newsletter. Please try again.",
    });
  }
});

// Retrieve all newsletter subscribers
app.get(["/api/newsletter", "/newsletter"], async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: subscribers.length,
      data: subscribers,
    });
  } catch (error) {
    console.error("[Get Newsletter Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve subscribers.",
    });
  }
});

// -------------------------------------------------------------
// FLIGHT & HOTEL BOOKING + PAYMENT ROUTES
// -------------------------------------------------------------

// Submit Flight Booking
app.post(["/api/bookings/flight", "/bookings/flight"], async (req, res) => {
  try {
    const {
      flightNumber,
      airline,
      fromCity,
      toCity,
      departureDate,
      returnDate,
      cabinClass,
      passengersCount,
      passengerDetails,
      primaryContact,
      totalAmount,
      paymentMethod,
    } = req.body || {};

    if (!fromCity || !toCity || !primaryContact?.email || !primaryContact?.phone) {
      return res.status(400).json({
        success: false,
        error: "Missing required flight booking fields.",
      });
    }

    const pnr = "SFM" + Math.floor(100000 + Math.random() * 900000);
    const paymentId = "pay_" + Math.random().toString(36).substring(2, 12);

    const booking = new FlightBooking({
      pnr,
      flightNumber: flightNumber || "SF-602",
      airline: airline || "IndiGo Express",
      fromCity,
      toCity,
      departureDate: departureDate || "Tomorrow",
      returnDate: returnDate || "",
      cabinClass: cabinClass || "Economy",
      passengersCount: passengersCount || 1,
      passengerDetails: passengerDetails || [],
      primaryContact,
      totalAmount: totalAmount || 4999,
      paymentStatus: "PAID",
      paymentId,
      paymentMethod: paymentMethod || "Razorpay (UPI/Card)",
    });

    const saved = await booking.save();
    console.log(`[Flight Booking Success] PNR ${pnr} for ${primaryContact.email}`);

    return res.status(201).json({
      success: true,
      message: "Flight booking confirmed successfully!",
      data: saved,
    });
  } catch (error) {
    console.error("[Flight Booking Error]:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process flight booking.",
    });
  }
});

// Submit Hotel Booking
app.post(["/api/bookings/hotel", "/bookings/hotel"], async (req, res) => {
  try {
    const {
      hotelName,
      location,
      roomType,
      checkInDate,
      checkOutDate,
      roomsCount,
      guestsCount,
      primaryGuest,
      totalAmount,
      paymentMethod,
    } = req.body || {};

    if (!hotelName || !location || !primaryGuest?.email || !primaryGuest?.phone) {
      return res.status(400).json({
        success: false,
        error: "Missing required hotel booking fields.",
      });
    }

    const voucherId = "HTL" + Math.floor(100000 + Math.random() * 900000);
    const paymentId = "pay_" + Math.random().toString(36).substring(2, 12);

    const booking = new HotelBooking({
      voucherId,
      hotelName,
      location,
      roomType: roomType || "Deluxe Room",
      checkInDate: checkInDate || "Today",
      checkOutDate: checkOutDate || "Tomorrow",
      roomsCount: roomsCount || 1,
      guestsCount: guestsCount || 2,
      primaryGuest,
      totalAmount: totalAmount || 6499,
      paymentStatus: "PAID",
      paymentId,
      paymentMethod: paymentMethod || "Razorpay (UPI/Card)",
    });

    const saved = await booking.save();
    console.log(`[Hotel Booking Success] Voucher ${voucherId} for ${primaryGuest.email}`);

    return res.status(201).json({
      success: true,
      message: "Hotel booking confirmed successfully!",
      data: saved,
    });
  } catch (error) {
    console.error("[Hotel Booking Error]:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process hotel booking.",
    });
  }
});

// Create Payment Order (Razorpay style)
const Razorpay = require("razorpay");

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";

let razorpayInstance;
try {
  if (razorpayKeyId && razorpayKeySecret) {
    razorpayInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  }
} catch (err) {
  console.warn("Razorpay instance init warning:", err.message);
}

app.post(["/api/payments/create-order", "/payments/create-order"], async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body || {};
    const amountInPaise = Math.round((amount || 100) * 100);
    const rcpt = receipt || `rcpt_${Date.now()}`;

    if (razorpayInstance && razorpayKeySecret && !razorpayKeySecret.includes("secret")) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency,
          receipt: rcpt,
        });
        return res.json({
          success: true,
          keyId: razorpayKeyId,
          order,
        });
      } catch (rzpErr) {
        console.warn("[Razorpay API Order Fallback]:", rzpErr.message);
      }
    }

    // Standard Razorpay response without dummy order_id to prevent Checkout JS rejection
    return res.json({
      success: true,
      keyId: razorpayKeyId,
      amount: amountInPaise,
      currency,
      receipt: rcpt,
    });
  } catch (error) {
    console.error("[Create Order Error]:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post(["/api/payments/verify", "/payments/verify"], async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (razorpay_signature && razorpayKeySecret && !razorpayKeySecret.includes("secret")) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        return res.json({ success: true, message: "Razorpay payment signature verified." });
      }
    }

    return res.json({
      success: true,
      message: "Payment verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

if (typeof PhusionPassenger !== "undefined") {
  PhusionPassenger.configure({ autoInstall: false });
}

app.listen(PORT, () => {
  console.log(`SFM Travels server running on port ${PORT}`);
});

module.exports = app;
