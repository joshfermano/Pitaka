import express from 'express';
import { transactionController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as RequestHandler);

// Transaction routes
router.route('/').get(transactionController.getTransactions as RequestHandler);
router
  .route('/:id')
  .get(transactionController.getTransaction as RequestHandler);

// Transaction operations
router.post('/deposit', transactionController.deposit as RequestHandler);
router.post('/withdraw', transactionController.withdraw as RequestHandler);
router.post('/transfer', transactionController.transfer as RequestHandler);

export default router;
