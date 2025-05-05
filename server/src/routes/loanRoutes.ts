import express from 'express';
import { loanController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as unknown as RequestHandler);

// Loan routes
router
  .route('/')
  .get(loanController.getLoans as unknown as RequestHandler)
  .post(loanController.applyForLoan as unknown as RequestHandler);

router.route('/:id').get(loanController.getLoan as unknown as RequestHandler);

router.post(
  '/:id/payments',
  loanController.makeLoanPayment as unknown as RequestHandler
);
router.get(
  '/:id/payments',
  loanController.getLoanPayments as unknown as RequestHandler
);

export default router;
