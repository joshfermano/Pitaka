"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cardController_1 = require("../controllers/cardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all card routes
router.use(authMiddleware_1.protect);
// Get all cards for a user
router.get('/', cardController_1.getUserCards);
// Get a specific card
router.get('/:id', cardController_1.getCardById);
// Get a specific card with full details (including card number)
router.get('/:id/fulldetails', cardController_1.getCardWithFullDetails);
// Add a new card
router.post('/', cardController_1.addCard);
// Update a card
router.put('/:id', cardController_1.updateCard);
// Delete a card
router.delete('/:id', cardController_1.deleteCard);
exports.default = router;
