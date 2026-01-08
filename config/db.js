const mongoose = require('mongoose');
require('dotenv').config(); // đọc file .env
const { mongoStatus } = require('../middlewares/metrics.middleware');
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
    // Lắng nghe sự kiện MongoDB
    mongoose.connection.on('connected', () => {
      mongoStatus.set(1); //
    });

    mongoose.connection.on('disconnected', () => {
      mongoStatus.set(0);
    });

    mongoose.connection.on('error', err => {
      console.error('MongoDB error:', err);
      mongoStatus.set(0);
    });
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 50000, // tăng thời gian chờ server
      socketTimeoutMS: 55000, // tăng thời gian chờa socket
      bufferCommands: true, // queue lệnh khi chưa connect
    });
    console.log('Ok rồi mở mày ơi');
  } catch (err) {
    // MongoDB connection error
    process.exit(1);
  }
};

connectDB(); // Gọi hàm ngay khi file được require
