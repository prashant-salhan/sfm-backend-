const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb+srv://prashantsalhandev_db_user:RzsxTIMprSDQC0qf@sfm-travels.8fdo95v.mongodb.net/sfm_travels?retryWrites=true&w=majority";

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
  }
};

module.exports = connectDB;