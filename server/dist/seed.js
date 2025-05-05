"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const seedData_1 = require("./data/seedData");
const db_1 = require("./config/db");
const runSeed = async () => {
    try {
        console.log('🔄 Connecting to database...');
        const isConnected = await (0, db_1.connectDb)();
        if (!isConnected) {
            console.error('❌ Failed to connect to MongoDB');
            process.exit(1);
        }
        console.log('🌱 Starting database seeding...');
        await (0, seedData_1.seedDatabase)();
        console.log('✅ Seeding completed successfully');
        // Close the database connection
        await mongoose_1.default.disconnect();
        console.log('👋 MongoDB connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};
runSeed();
