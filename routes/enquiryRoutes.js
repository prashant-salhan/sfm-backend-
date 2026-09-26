const express = require("express");
const Enquiry = require("../models/Enquiry");

const router = express.Router();

// POST /api/enquiries
router.post("/", async (req, res) => {
  try {
    const { fullName, phone, destination, message } = req.body;

    if (!fullName || !phone || !destination || !message) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const enquiry = await Enquiry.create({
      fullName,
      phone,
      destination,
      message,
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