const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const mongoUri =
  process.env.MONGO_URI ||
  "mongodb+srv://prashantsalhandev_db_user:RzsxTIMprSDQC0qf@sfm-travels.8fdo95v.mongodb.net/sfm_travels?retryWrites=true&w=majority&appName=SFM-TRAVELS";

const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

const enquirySchema = new mongoose.Schema(
  {
    fullName: String,
    name: String,
    phone: String,
    destination: String,
    message: String,
    source: String,
    status: String,
  },
  { timestamps: true }
);

const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);

async function runSync() {
  console.log("=================================================");
  console.log("🚀 SFM Travels - MongoDB to Google Sheets Sync");
  console.log("=================================================");

  if (!webhookUrl || !webhookUrl.trim().startsWith("http")) {
    console.error("❌ ERROR: GOOGLE_SHEET_WEBHOOK_URL is not set in backend_sfm/.env");
    console.error("Please add: GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/.../exec");
    process.exit(1);
  }

  console.log(`📡 Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);
  console.log(`✅ Connected to MongoDB!`);

  const enquiries = await Enquiry.find().sort({ createdAt: 1 });
  console.log(`📦 Found ${enquiries.length} total enquiries in database.`);

  if (enquiries.length === 0) {
    console.log("No enquiries to sync.");
    await mongoose.disconnect();
    return;
  }

  const formatted = enquiries.map((item) => {
    const d = item.createdAt ? new Date(item.createdAt) : new Date();
    const istTime = d.toLocaleString("en-IN", {
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
      id: String(item._id),
      timestamp: istTime,
      fullName: item.fullName || item.name || "Guest",
      phone: item.phone || "",
      destination: item.destination || "Incredible India",
      message: item.message || "",
      source: item.source || "contact_form",
      status: item.status || "new",
    };
  });

  console.log(`📤 Sending ${formatted.length} entries to Google Sheets Webhook...`);
  try {
    const response = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "batch", enquiries: formatted }),
      redirect: "follow",
    });

    const text = await response.text();
    console.log(`🎉 Google Sheets Response:`, text);
    console.log(`✅ Sync Completed Successfully!`);
  } catch (err) {
    console.error(`❌ Failed to send to Google Sheets:`, err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runSync().catch(console.error);
