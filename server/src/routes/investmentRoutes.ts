import express from 'express';
import * as investmentController from '../controllers/investmentController';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as unknown as RequestHandler);

// Companies routes
router.get(
  '/companies',
  investmentController.getAllCompanies as unknown as RequestHandler
);
router.get(
  '/companies/:companyId',
  investmentController.getCompanyById as unknown as RequestHandler
);

// Investments routes
router.get(
  '/user',
  investmentController.getUserInvestments as unknown as RequestHandler
);
router.get(
  '/user/:investmentId',
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

export default router;
