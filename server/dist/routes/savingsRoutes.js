"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Protect all routes
router.use(authMiddleware_1.protect);
// Create and retrieve savings
router
    .route('/')
    .post(controllers_1.savingsController.createSavings)
    .get(controllers_1.savingsController.getSavings);
// Get specific savings by ID
router.route('/:id').get(controllers_1.savingsController.getSavingsById);
// Deposit and withdraw from savings
router
    .route('/:id/deposit')
    .post(controllers_1.savingsController.depositToSavings);
router
    .route('/:id/withdraw')
    .post(controllers_1.savingsController.withdrawFromSavings);
exports.default = router;
