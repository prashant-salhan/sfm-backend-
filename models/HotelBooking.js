const mongoose = require("mongoose");

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

module.exports = mongoose.model("HotelBooking", hotelBookingSchema);
