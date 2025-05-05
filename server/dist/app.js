"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const db_1 = require("./config/db");
const seedData_1 = require("./data/seedData");
const PORT = process.env.PORT || 5000;
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.get('/', (req, res) => {
    res.send('Pitaka API is running');
});
const startServer = async () => {
    try {
        const isConnected = await (0, db_1.connectDb)();
        if (!isConnected) {
            console.error('❌ Failed to start: MongoDB connection unsuccessful');
            process.exit(1);
        }
        else {
            console.log('✅ MongoDB connection successful');
            // Seed database with initial data if in development mode
            if (process.env.NODE_ENV === 'development') {
                await (0, seedData_1.seedDatabase)();
            }
        }
        app.listen(PORT, () => {
            console.log(`✨ Server running on port: ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
