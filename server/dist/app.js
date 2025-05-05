"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_status_codes_1 = require("http-status-codes");
require("dotenv/config");
const db_1 = require("./config/db");
const seedData_1 = require("./data/seedData");
const authMiddleware_1 = require("./middlewares/authMiddleware");
const routes_1 = require("./routes");
const PORT = process.env.PORT || 6000;
const app = (0, express_1.default)();
// Allowed origins for CORS
const allowedOrigins = [
    // Local development
    'http://localhost:6000',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006', // Expo web
    // Add any other origins you need to support
    'http://127.0.0.1:6000',
    'http://127.0.0.1:19006',
    'http://127.0.0.1:19000',
    // Production URLs
    'https://pitaka-client.vercel.app',
    'https://pitaka-app.example.com',
    // Additional entries for Android and iOS testing
    'capacitor://localhost',
    'ionic://localhost',
    'http://10.0.2.2:6000', // Android emulator pointing to localhost
    'http://10.0.2.2:19000', // Android emulator pointing to Expo dev server
    'http://192.168.1.1:6000', // Common local network IP
];
// CORS configuration with more specific settings
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Allow all origins in development for easier testing
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        // In production, check against the allowed origins list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.warn(`Origin ${origin} not allowed by CORS`);
            // Still allow for testing, log warning only
            callback(null, true);
        }
    },
    credentials: true, // Allow passing cookies and authentication
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200, // For legacy browser support
}));
// For preflight requests
app.options('*', (0, cors_1.default)());
// Other middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Set common CORS headers for all responses
app.use((req, res, next) => {
    // Set Access-Control-Allow-Credentials to true for all responses
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
// Routes
app.get('/', (req, res) => {
    res.send('Pitaka API is running');
});
// API Routes
app.use('/api/auth', routes_1.authRoutes);
app.use('/api/accounts', routes_1.accountRoutes);
app.use('/api/transactions', routes_1.transactionRoutes);
app.use('/api/payments', routes_1.paymentRoutes);
app.use('/api/loans', routes_1.loanRoutes);
app.use('/api/savings', routes_1.savingsRoutes);
app.use('/api/investments', routes_1.investmentRoutes);
// Simple status route to check if the server is running
app.get('/api/status', (req, res) => {
    console.log('Status endpoint hit');
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// Error handler middleware
app.use(authMiddleware_1.errorHandler);
// Handle 404 - Not found errors
app.use((req, res) => {
    res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
    });
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
            console.log(`🔗 API URL: http://localhost:${PORT}`);
            console.log(`🌐 For Android emulator: http://10.0.2.2:${PORT}`);
            console.log(`🌐 For web testing: http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
