import express from 'express';
import * as paymentController from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Public biller routes (no auth required)
router.get(
  '/billers',
  paymentController.getAllBillers as unknown as RequestHandler
);

router.get(
  '/billers/popular',
  paymentController.getPopularBillers as unknown as RequestHandler
);

router.get(
  '/billers/category/:category',
  paymentController.getBillersByCategory as unknown as RequestHandler
);

router.get(
  '/billers/:id',
  paymentController.getBillerById as unknown as RequestHandler
);

// Protected routes - require authentication
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
