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
