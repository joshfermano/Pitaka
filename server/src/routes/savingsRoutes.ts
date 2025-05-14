import express from 'express';
import { savingsController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Protect all routes
router.use(protect as unknown as RequestHandler);

// Create and retrieve savings
router
  .route('/')
  .post(savingsController.createSavings as unknown as RequestHandler)
  .get(savingsController.getSavings as unknown as RequestHandler);

// Get specific savings by ID
router
  .route('/:id')
  .get(savingsController.getSavingsById as unknown as RequestHandler)
  .patch(savingsController.updateSavingsAccount as unknown as RequestHandler)
  .delete(savingsController.deleteSavingsAccount as unknown as RequestHandler);

// Transactions for specific savings
router
  .route('/:id/transactions')
  .get(
    savingsController.getTransactionsForSavings as unknown as RequestHandler
  );

// Deposit and withdraw from savings
router
  .route('/:id/deposit')
  .post(savingsController.depositToSavings as unknown as RequestHandler);

router
  .route('/:id/withdraw')
  .post(savingsController.withdrawFromSavings as unknown as RequestHandler);

export default router;
