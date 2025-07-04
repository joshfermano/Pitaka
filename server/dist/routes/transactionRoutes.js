"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// All routes are protected
router.use(authMiddleware_1.protect);
// Transaction routes
router
    .route('/')
    .get(controllers_1.transactionController.getTransactions);
// Recent transactions
router
    .route('/recent')
    .get(controllers_1.transactionController.getRecentTransactions);
// IMPORTANT: The specific route must come BEFORE the generic ID route
// Get transaction by transactionId field specifically
router
    .route('/by-transaction-id/:transactionId')
    .get(controllers_1.transactionController.getTransaction);
// Get transaction by MongoDB _id (must come AFTER more specific routes)
router
    .route('/:id')
    .get(controllers_1.transactionController.getTransaction);
// Transaction operations
router.post('/deposit', controllers_1.transactionController.deposit);
router.post('/withdraw', controllers_1.transactionController.withdraw);
router.post('/transfer', controllers_1.transactionController.transfer);
exports.default = router;
