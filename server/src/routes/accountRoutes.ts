import express from 'express';
import { accountController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as unknown as RequestHandler);

// Account routes
router
  .route('/')
  .get(accountController.getAccounts as unknown as RequestHandler)
  .post(accountController.createAccount as unknown as RequestHandler);

router
  .route('/:id')
  .get(accountController.getAccount as unknown as RequestHandler);

router.get(
  '/:id/balance',
  accountController.getAccountBalance as unknown as RequestHandler
);
router.get(
  '/:id/transactions',
  accountController.getAccountTransactions as unknown as RequestHandler
);

export default router;
