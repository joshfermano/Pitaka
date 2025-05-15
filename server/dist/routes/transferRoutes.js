"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transferController_1 = require("../controllers/transferController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all transfer routes
router.use(authMiddleware_1.protect);
// Transfer recipient routes
router
    .route('/recipients')
    .get(transferController_1.getTransferRecipients)
    .post(transferController_1.addTransferRecipient);
router
    .route('/recipients/:id/favorite')
    .patch(transferController_1.toggleFavoriteRecipient);
router
    .route('/recipients/:id')
    .delete(transferController_1.removeTransferRecipient);
// Transfer operation routes
router
    .route('/internal')
    .post(transferController_1.transferBetweenOwnAccounts);
router
    .route('/external')
    .post(transferController_1.transferToAnotherUser);
router
    .route('/interbank')
    .post(transferController_1.transferToAnotherBank);
exports.default = router;
