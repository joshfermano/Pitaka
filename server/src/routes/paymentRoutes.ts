import express from 'express';
import { paymentController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as unknown as RequestHandler);

// Payment routes
router
  .route('/')
  .get(paymentController.getPayments as unknown as RequestHandler)
  .post(paymentController.createPayment as unknown as RequestHandler);

router
  .route('/:id')
  .get(paymentController.getPayment as unknown as RequestHandler);

router.patch(
  '/:id/cancel',
  paymentController.cancelPayment as unknown as RequestHandler
);

export default router;
