// tests/globalTeardown.js - Global teardown cho integration tests (KHÔNG XÓA DATA)
const mongoose = require("mongoose");

module.exports = async () => {

  try {
    // Chỉ đóng kết nối, KHÔNG xóa data
    if (mongoose.connection.readyState === 1) {


      // Đóng kết nối
      await mongoose.connection.close();

    }
  } catch (error) {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};
