const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

async function clear() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not defined in .env.test');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error dropping database:', err);
    process.exit(1);
  }
}

clear();
