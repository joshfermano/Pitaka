import express from 'express';
import { paymentController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as RequestHandler);

// Payment routes
router
  .route('/')
  .get(paymentController.getPayments as RequestHandler)
  .post(paymentController.createPayment as RequestHandler);

router.route('/:id').get(paymentController.getPayment as RequestHandler);

router.patch('/:id/cancel', paymentController.cancelPayment as RequestHandler);

export default router;
