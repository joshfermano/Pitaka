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
// Account routes
router
    .route('/')
    .get(controllers_1.accountController.getAccounts)
    .post(controllers_1.accountController.createAccount);
router.route('/:id').get(controllers_1.accountController.getAccount);
router.get('/:id/balance', controllers_1.accountController.getAccountBalance);
router.get('/:id/transactions', controllers_1.accountController.getAccountTransactions);
exports.default = router;
