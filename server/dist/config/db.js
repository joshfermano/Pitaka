"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv/config");
const connectDb = async () => {
    try {
        const connectionString = process.env.MONGO_URI;
        await mongoose_1.default.connect(connectionString);
        mongoose_1.default.connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });
        process.on('SIGINT', async () => {
            await mongoose_1.default.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });
        return true;
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        return false;
    }
};
exports.connectDb = connectDb;
