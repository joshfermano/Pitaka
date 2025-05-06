import express, { RequestHandler } from 'express';
import {
  getTransferRecipients,
  addTransferRecipient,
  toggleFavoriteRecipient,
  removeTransferRecipient,
  transferBetweenOwnAccounts,
  transferToAnotherUser,
  transferToAnotherBank,
} from '../controllers/transferController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all transfer routes
router.use(protect as unknown as RequestHandler);

// Transfer recipient routes
router
  .route('/recipients')
  .get(getTransferRecipients as unknown as RequestHandler)
  .post(addTransferRecipient as unknown as RequestHandler);

router
  .route('/recipients/:id/favorite')
  .patch(toggleFavoriteRecipient as unknown as RequestHandler);

router
  .route('/recipients/:id')
  .delete(removeTransferRecipient as unknown as RequestHandler);

// Transfer operation routes
router
  .route('/internal')
  .post(transferBetweenOwnAccounts as unknown as RequestHandler);

router
  .route('/external')
  .post(transferToAnotherUser as unknown as RequestHandler);

router
  .route('/interbank')
  .post(transferToAnotherBank as unknown as RequestHandler);

export default router;
