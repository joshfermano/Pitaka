import express from 'express';
import { authController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Public routes
router.post('/register', authController.register as unknown as RequestHandler);
router.post('/login', authController.login as unknown as RequestHandler);
router.post('/logout', authController.logout as unknown as RequestHandler);

// Protected routes
router.use(protect as unknown as RequestHandler);

// Get user profile
router
  .route('/profile')
  .get(authController.getProfile as unknown as RequestHandler)
  .put(authController.updateProfile as unknown as RequestHandler);

export default router;
