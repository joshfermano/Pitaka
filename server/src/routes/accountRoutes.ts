import express from 'express';
import { accountController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// All routes are protected
router.use(protect as RequestHandler);

// Account routes
router
  .route('/')
  .get(accountController.getAccounts as RequestHandler)
  .post(accountController.createAccount as RequestHandler);

router.route('/:id').get(accountController.getAccount as RequestHandler);

router.get(
  '/:id/balance',
  accountController.getAccountBalance as RequestHandler
);
router.get(
  '/:id/transactions',
  accountController.getAccountTransactions as RequestHandler
);

export default router;
