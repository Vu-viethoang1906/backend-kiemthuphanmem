// tests/globalSetup.js - Global setup cho integration tests
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
module.exports = async () => {

  const testDbUri = process.env.MONGO_URI;

  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    throw error;
  }
};
