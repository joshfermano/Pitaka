import express, { RequestHandler } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserSettings,
  updateUserSettings,
  searchUsers,
  getUserById,
} from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(protect as unknown as RequestHandler);

// User profile routes
router
  .route('/profile')
  .get(getUserProfile as unknown as RequestHandler)
  .put(updateUserProfile as unknown as RequestHandler);

// User settings routes
router
  .route('/settings')
  .get(getUserSettings as unknown as RequestHandler)
  .put(updateUserSettings as unknown as RequestHandler);

// Search users
router.get('/search', searchUsers as unknown as RequestHandler);

// Get user by ID
router.get('/:id', getUserById as unknown as RequestHandler);

export default router;
