import express from 'express';
import { loanController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as RequestHandler);

// Loan routes
router
  .route('/')
  .get(loanController.getLoans as RequestHandler)
  .post(loanController.applyForLoan as RequestHandler);

router.route('/:id').get(loanController.getLoan as RequestHandler);

router.post('/:id/payment', loanController.makeLoanPayment as RequestHandler);
router.get('/:id/payments', loanController.getLoanPayments as RequestHandler);

export default router;
