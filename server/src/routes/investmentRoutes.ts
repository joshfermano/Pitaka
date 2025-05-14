import express from 'express';
import * as investmentController from '../controllers/investmentController';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Public company routes (no auth required)
router.get(
  '/companies',
  investmentController.getAllCompanies as unknown as RequestHandler
);

router.get(
  '/companies/:id',
  investmentController.getCompanyById as unknown as RequestHandler
);

// Add company price history endpoint
router.get(
  '/companies/:id/history',
  investmentController.getCompanyPriceHistory as unknown as RequestHandler
);

// Protected routes - require authentication
router.use(protect as unknown as RequestHandler);

// User investments routes
router.get(
  '/user',
  investmentController.getUserInvestments as unknown as RequestHandler
);

router.get(
  '/user/:id',
  investmentController.getInvestmentById as unknown as RequestHandler
);

router.post(
  '/buy',
  investmentController.buyShares as unknown as RequestHandler
);

router.post(
  '/sell',
  investmentController.sellShares as unknown as RequestHandler
);

router.get(
  '/performance',
  investmentController.getPerformance as unknown as RequestHandler
);

// New transaction history route
router.get(
  '/transactions',
  investmentController.getTransactionHistory as unknown as RequestHandler
);

// Price alerts routes
router.get(
  '/alerts',
  investmentController.getAlerts as unknown as RequestHandler
);

router.post(
  '/alerts/create',
  investmentController.createAlert as unknown as RequestHandler
);

router.patch(
  '/alerts/:id',
  investmentController.updateAlert as unknown as RequestHandler
);

router.delete(
  '/alerts/:id',
  investmentController.deleteAlert as unknown as RequestHandler
);

export default router;
