const mongoose = require("mongoose");

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
    passengerDetails: [
      {
        fullName: String,
        age: String,
        gender: String,
      },
    ],
    primaryContact: {
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, default: "PAID" },
    paymentId: { type: String, default: "" },
    paymentMethod: { type: String, default: "Razorpay (UPI/Card)" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FlightBooking", flightBookingSchema);
