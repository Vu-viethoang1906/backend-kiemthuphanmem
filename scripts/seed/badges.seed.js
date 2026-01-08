require('dotenv').config();
const mongoose = require('mongoose');
const Badge = require('../../models/badge.model');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    process.exit(1);
  }
};

const defaultBadges = [
  {
    name: 'First Task',
    description: 'Hoàn thành task đầu tiên',
    category: 'achievement',
    criteria: { type: 'task_count', value: 1 },
    points_reward: 10,
    is_active: true,
  },
  {
    name: 'Task Master',
    description: 'Hoàn thành 10 tasks',
    category: 'achievement',
    criteria: { type: 'task_count', value: 10 },
    points_reward: 50,
    is_active: true,
  },
  {
    name: 'Point Collector',
    description: 'Đạt 100 điểm',
    category: 'achievement',
    criteria: { type: 'points_threshold', value: 100 },
    points_reward: 20,
    is_active: true,
  },
  {
    name: 'Top Performer',
    description: 'Đứng đầu bảng xếp hạng',
    category: 'competitive',
    criteria: { type: 'first_place', value: 1 },
    points_reward: 100,
    is_active: true,
  },
  {
    name: 'Top 10',
    description: 'Nằm trong top 10',
    category: 'competitive',
    criteria: { type: 'top_10', value: 10 },
    points_reward: 50,
    is_active: true,
  },
  {
    name: 'Team Player',
    description: 'Tham gia 5 tasks nhóm',
    category: 'collaborative',
    criteria: { type: 'collaboration_count', value: 5 },
    points_reward: 30,
    is_active: true,
  },
  {
    name: 'Streak Master',
    description: 'Hoàn thành task 7 ngày liên tiếp',
    category: 'achievement',
    criteria: { type: 'streak_days', value: 7 },
    points_reward: 40,
    is_active: true,
  },
];

async function seedBadges() {
  await connectDB();

  try {
    for (const badgeData of defaultBadges) {
      const existing = await Badge.findOne({ name: badgeData.name });

      if (!existing) {
        await Badge.create(badgeData);
      }
    }

    const totalBadges = await Badge.countDocuments({ is_active: true });
  } catch (error) {
  } finally {
    await mongoose.disconnect();
  }
}

seedBadges();
