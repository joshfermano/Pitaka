import express from 'express';
import * as loanController from '../controllers/loanController';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Public loan product routes (no auth required)
router.get(
  '/products',
  loanController.getLoanProducts as unknown as RequestHandler
);

router.get(
  '/products/:id',
  loanController.getLoanProductById as unknown as RequestHandler
);

// Protected routes - require authentication
router.use(protect as unknown as RequestHandler);

// Loan routes
router
  .route('/')
  .get(loanController.getLoans as unknown as RequestHandler)
  .post(loanController.applyForLoan as unknown as RequestHandler);

router.route('/:id').get(loanController.getLoan as unknown as RequestHandler);

router.post(
  '/:id/payment',
  loanController.makeLoanPayment as unknown as RequestHandler
);

router.get(
  '/:id/payments',
  loanController.getLoanPayments as unknown as RequestHandler
);

export default router;
