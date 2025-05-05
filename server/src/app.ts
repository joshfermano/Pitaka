import express from 'express';
import cors from 'cors';
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
} from './routes';

const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Pitaka API is running');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/savings', savingsRoutes);

// Error handler middleware
app.use(errorHandler);

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
      console.log(`📃 API Documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();

export default app;
