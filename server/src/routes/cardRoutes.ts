import express, { RequestHandler } from 'express';
import {
  getUserCards,
  getCardById,
  addCard,
  updateCard,
  deleteCard,
} from '../controllers/cardController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Apply authentication middleware to all card routes
router.use(protect as unknown as RequestHandler);

// Get all cards for a user
router.get('/', getUserCards as unknown as RequestHandler);

// Get a specific card
router.get('/:id', getCardById as unknown as RequestHandler);

// Add a new card
router.post('/', addCard as unknown as RequestHandler);

// Update a card
router.put('/:id', updateCard as unknown as RequestHandler);

// Delete a card
router.delete('/:id', deleteCard as unknown as RequestHandler);

export default router;
