import express from 'express';
import { authController } from '../controllers';
import { protect } from '../middlewares/authMiddleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Public routes
router.post('/register', authController.register as RequestHandler);
router.post('/login', authController.login as RequestHandler);

// Protected routes
router.get(
  '/profile',
  protect as RequestHandler,
  authController.getProfile as RequestHandler
);
router.put(
  '/profile',
  protect as RequestHandler,
  authController.updateProfile as RequestHandler
);

export default router;
