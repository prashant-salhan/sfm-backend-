const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "Destination is required"],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    travelDate: {
      type: String,
      trim: true,
      default: "",
    },
    travellers: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["contact_form", "modal_planner", "quick_enquiry"],
      default: "contact_form",
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "contacted", "closed"],
      default: "new",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
