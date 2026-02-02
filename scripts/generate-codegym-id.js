const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../models/usersModel");

/**
 * Script để generate codegymId cho các user hiện có chưa có codegymId
 */
async function generateCodegymIds() {
  try {
    // Kết nối database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/your-db";
    await mongoose.connect(mongoUri);
    console.log("✅ Đã kết nối database");

    // Tìm tất cả user chưa có codegymId
    const users = await User.find({
      $or: [{ codegymId: { $exists: false } }, { codegymId: null }, { codegymId: "" }],
      deleted_at: null,
    });

    console.log(`📊 Tìm thấy ${users.length} user cần generate codegymId`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Generate codegymId: CG + timestamp + random 4 số
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(1000 + Math.random() * 9000);
        let codegymId = `CG${timestamp}${random}`;

        // Đảm bảo codegymId là unique
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          const existingUser = await User.findOne({ codegymId });
          if (!existingUser) {
            isUnique = true;
          } else {
            const newRandom = Math.floor(1000 + Math.random() * 9000);
            codegymId = `CG${timestamp}${newRandom}`;
            attempts++;
          }
        }

        if (isUnique) {
          user.codegymId = codegymId;
          await user.save();
          console.log(`✅ User ${user.email} - CodeGym ID: ${codegymId}`);
          successCount++;
        } else {
          console.error(`❌ Không thể generate unique codegymId cho user ${user.email}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Lỗi khi generate codegymId cho user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📈 Kết quả:");
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Lỗi: ${errorCount}`);

    await mongoose.disconnect();
    console.log("✅ Đã đóng kết nối database");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Chạy script
generateCodegymIds();

