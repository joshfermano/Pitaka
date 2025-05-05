import mongoose from 'mongoose';
import 'dotenv/config';
import { seedDatabase } from './data/seedData';
import { connectDb } from './config/db';

const runSeed = async () => {
  try {
    console.log('🔄 Connecting to database...');
    const isConnected = await connectDb();

    if (!isConnected) {
      console.error('❌ Failed to connect to MongoDB');
      process.exit(1);
    }

    console.log('🌱 Starting database seeding...');
    await seedDatabase();
    console.log('✅ Seeding completed successfully');

    // Close the database connection
    await mongoose.disconnect();
    console.log('👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

runSeed();
