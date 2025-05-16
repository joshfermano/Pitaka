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
const PORT = process.env.PORT || 5000;
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
    // Mobile device testing with Expo Go
    'exp://localhost:19000',
    'exp://127.0.0.1:19000',
    // Common development IP addresses
    'http://192.168.1.9:19000',
    'exp://192.168.1.9:19000',
    'http://192.168.1.9:6000',
    'http://192.168.1.9:8081',
    'http://192.168.1.10:19000',
    'exp://192.168.1.10:19000',
    'http://192.168.1.10:6000',
    'http://192.168.1.10:8081',
    'http://192.168.1.12:19000',
    'exp://192.168.1.12:19000',
    'http://192.168.1.12:6000',
    'http://192.168.1.12:8081',
    // Android emulator special IP
    'http://10.0.2.2:19000',
    'exp://10.0.2.2:19000',
    'http://10.0.2.2:6000',
    // Production URLs
    'https://pitaka-app.vercel.app',
    'https://pitaka-web.vercel.app',
    'https://pitaka.app',
    'capacitor://localhost',
    'http://localhost',
];
// CORS middleware
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        console.log(`CORS request from origin: ${origin || 'No origin (likely mobile app)'}`);
        // During development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: Allowing all origins');
            return callback(null, true);
        }
        // Allow requests with no origin (like mobile apps)
        if (!origin) {
            console.log('CORS: Allowing request with no origin (mobile app)');
            return callback(null, true);
        }
        // In production, check against the allowed origins list
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            console.log('CORS: Origin allowed:', origin);
            callback(null, true);
        }
        else {
            // Check if it's a dynamic IP in development range
            const isDynamicLocalIP = /^https?:\/\/192\.168\.\d+\.\d+/.test(origin);
            if (isDynamicLocalIP) {
                console.log('CORS: Allowing dynamic local IP:', origin);
                return callback(null, true);
            }
            console.warn(`CORS: Origin ${origin} not allowed in production`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
}));
app.options('*', (0, cors_1.default)());
// Other middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Add global request logger middleware before any routes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} (${req.path})`);
    next();
});
// Disable caching for API responses
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});
// Routes
app.get('/api/health', (req, res) => {
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
app.use('/api/cards', routes_1.cardRoutes);
// Add detailed logging for transfer routes
app.use('/api/transfers', (req, res, next) => {
    console.log(`Transfer route hit: ${req.method} ${req.originalUrl}`, {
        params: req.params,
        body: req.body,
        user: req.user,
    });
    next();
}, routes_1.transferRoutes);
app.use('/api/users', routes_1.userRoutes);
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
            if (process.env.NODE_ENV === 'development') {
                try {
                    console.log('🌱 Seeding database with initial data...');
                    await (0, seedData_1.seedDatabase)();
                    console.log('✅ Database seeding completed');
                }
                catch (error) {
                    console.error('Error during database seeding:', error);
                }
            }
        }
        app.listen(PORT, () => {
            console.log(`✨ Server running on port: ${PORT}`);
            console.log(`🔗 API URL: http://localhost:${PORT}`);
            console.log(`🌐 For Android emulator: http://10.0.2.2:${PORT}`);
            console.log(`🌐 For iOS simulator: http://localhost:${PORT}`);
            console.log(`🌐 For web testing: http://localhost:${PORT}`);
            // Get local network IP for physical device testing
            try {
                const { networkInterfaces } = require('os');
                const nets = networkInterfaces();
                const results = Object.create(null);
                for (const name of Object.keys(nets)) {
                    for (const net of nets[name]) {
                        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                        if (net.family === 'IPv4' && !net.internal) {
                            if (!results[name]) {
                                results[name] = [];
                            }
                            results[name].push(net.address);
                        }
                    }
                }
                console.log('🔥 Available on your network at:');
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        value.forEach((ip) => {
                            console.log(`   http://${ip}:${PORT} (${key})`);
                        });
                    }
                }
                console.log('👉 For Expo Go testing on physical devices, use your network IP');
            }
            catch (error) {
                console.log('⚠️ Could not determine network IP addresses');
            }
        });
    }
    catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
