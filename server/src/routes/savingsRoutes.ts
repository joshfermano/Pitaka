import express from 'express';
import { savingsController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Protect all routes
router.use(protect as RequestHandler);

// Create and retrieve savings
router
  .route('/')
  .post(savingsController.createSavings as RequestHandler)
  .get(savingsController.getSavings as RequestHandler);

// Get specific savings by ID
router.route('/:id').get(savingsController.getSavingsById as RequestHandler);

// Deposit and withdraw from savings
router
  .route('/:id/deposit')
  .post(savingsController.depositToSavings as RequestHandler);

router
  .route('/:id/withdraw')
  .post(savingsController.withdrawFromSavings as RequestHandler);

export default router;
