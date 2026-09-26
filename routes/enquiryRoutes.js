const express = require("express");
const Enquiry = require("../models/Enquiry");

const router = express.Router();

// POST /api/enquiries
router.post("/", async (req, res) => {
  try {
    const { fullName, phone, destination, message, travelDate, travellers, source } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({
        message: "Full name and phone number are required",
      });
    }

    const enquiry = await Enquiry.create({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      destination: destination ? String(destination).trim() : "Incredible India Tour Package",
      message: message ? String(message).trim() : "",
      travelDate: travelDate ? String(travelDate).trim() : "",
      travellers: travellers ? String(travellers).trim() : "",
      source: source ? String(source).trim() : "india_portal_popup",
    });

    res.status(201).json({
      message: "Enquiry submitted successfully",
      enquiry,
    });
  } catch (error) {
    console.error("Enquiry Error:", error);

    res.status(500).json({
      message: "Failed to submit enquiry",
      error: error.message,
    });
  }
});

// GET /api/enquiries
router.get("/", async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });

    res.json(enquiries);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch enquiries",
      error: error.message,
    });
  }
});

module.exports = router;