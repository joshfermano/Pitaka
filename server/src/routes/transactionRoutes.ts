import express from 'express';
import { transactionController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as unknown as RequestHandler);

// Transaction routes
router
  .route('/')
  .get(transactionController.getTransactions as unknown as RequestHandler);

// Recent transactions
router
  .route('/recent')
  .get(
    transactionController.getRecentTransactions as unknown as RequestHandler
  );

// IMPORTANT: The specific route must come BEFORE the generic ID route
// Get transaction by transactionId field specifically
router
  .route('/by-transaction-id/:transactionId')
  .get(transactionController.getTransaction as unknown as RequestHandler);

// Get transaction by MongoDB _id (must come AFTER more specific routes)
router
  .route('/:id')
  .get(transactionController.getTransaction as unknown as RequestHandler);

// Transaction operations
router.post(
  '/deposit',
  transactionController.deposit as unknown as RequestHandler
);
router.post(
  '/withdraw',
  transactionController.withdraw as unknown as RequestHandler
);
router.post(
  '/transfer',
  transactionController.transfer as unknown as RequestHandler
);

export default router;
