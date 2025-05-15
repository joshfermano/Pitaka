import express, { Request, Response, RequestHandler } from 'express';
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

// Enhanced debug middleware for route matching
router.use((req, res, next) => {
  console.log(
    `Transfer route middleware: ${req.method} ${req.originalUrl} -> ${
      req.path
    } (Auth: ${req.user ? 'YES' : 'NO'})`
  );
  next();
});

// Apply authentication middleware to all transfer routes
router.use(protect as unknown as RequestHandler);

// Add debug message after authentication to verify user
router.use((req, res, next) => {
  console.log(`User authenticated: ${req.user?.email} (${req.user?.id})`);
  next();
});

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

// Define the external transfer route explicitly
router
  .route('/external')
  .post(transferToAnotherUser as unknown as RequestHandler);

router
  .route('/interbank')
  .post(transferToAnotherBank as unknown as RequestHandler);

// Fallback route for debugging
router.use('*', (req, res) => {
  console.error(
    `Unmatched transfer route: ${req.method} ${req.originalUrl} (Auth: ${
      req.user ? 'YES' : 'NO'
    })`
  );
  res.status(404).json({
    success: false,
    message: `Transfer route not found: ${req.originalUrl}`,
    availableRoutes: [
      '/recipients [GET, POST]',
      '/recipients/:id [DELETE]',
      '/recipients/:id/favorite [PATCH]',
      '/internal [POST]',
      '/external [POST]',
      '/interbank [POST]',
    ],
  });
});

export default router;
