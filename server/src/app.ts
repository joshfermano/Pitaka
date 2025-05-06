import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { StatusCodes } from 'http-status-codes';
import 'dotenv/config';
import { connectDb } from './config/db';
import { seedDatabase } from './data/seedData';
import { errorHandler } from './middlewares/authMiddleware';
import {
  authRoutes,
  accountRoutes,
  transactionRoutes,
  paymentRoutes,
  loanRoutes,
  savingsRoutes,
  investmentRoutes,
  cardRoutes,
  transferRoutes,
  userRoutes,
} from './routes';

const PORT = process.env.PORT || 5000;

const app = express();

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
  // Add your specific local network IP - crucial for Expo Go on physical devices
  'http://192.168.1.2:19000',
  'exp://192.168.1.2:19000',
  'http://192.168.1.2:6000',
  // Android emulator special IP
  'http://10.0.2.2:19000',
  'exp://10.0.2.2:19000',
  'http://10.0.2.2:6000',
  // Wildcard for development
  '*',
  // If your app is hosted, add the production URLs here
];

// CORS configuration with more permissive settings for development
app.use(
  cors({
    origin: function (origin, callback) {
      // Log all origins for debugging
      console.log(
        `CORS request from origin: ${origin || 'No origin (likely mobile app)'}`
      );

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
        callback(null, true);
      } else {
        console.warn(`CORS: Origin ${origin} not allowed in production`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.options('*', cors());

// Other middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.get('/api/health', (req, res) => {
  res.send('Pitaka API is running');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/users', userRoutes);

// Simple status route to check if the server is running
app.get('/api/status', (req, res) => {
  console.log('Status endpoint hit');
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handler middleware
app.use(errorHandler);

// Handle 404 - Not found errors
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

const startServer = async () => {
  try {
    const isConnected = await connectDb();

    if (!isConnected) {
      console.error('❌ Failed to start: MongoDB connection unsuccessful');
      process.exit(1);
    } else {
      console.log('✅ MongoDB connection successful');

      // Seed database with initial data if in development mode
      if (process.env.NODE_ENV === 'development') {
        await seedDatabase();
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
        console.log(
          '👉 For Expo Go testing on physical devices, use your network IP'
        );
      } catch (error) {
        console.log('⚠️ Could not determine network IP addresses');
      }
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();

export default app;
