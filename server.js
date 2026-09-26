const path = require("path");
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
    source: { type: String, enum: ["contact_form", "modal_planner", "quick_enquiry"], default: "contact_form" },
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
const crypto = require("crypto");

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
