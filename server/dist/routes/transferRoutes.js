"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transferController_1 = require("../controllers/transferController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Enhanced debug middleware for route matching
router.use((req, res, next) => {
    console.log(`Transfer route middleware: ${req.method} ${req.originalUrl} -> ${req.path} (Auth: ${req.user ? 'YES' : 'NO'})`);
    next();
});
// Apply authentication middleware to all transfer routes
router.use(authMiddleware_1.protect);
// Add debug message after authentication to verify user
router.use((req, res, next) => {
    console.log(`User authenticated: ${req.user?.email} (${req.user?.id})`);
    next();
});
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
// Define the external transfer route explicitly
router
    .route('/external')
    .post(transferController_1.transferToAnotherUser);
router
    .route('/interbank')
    .post(transferController_1.transferToAnotherBank);
// Fallback route for debugging
router.use('*', (req, res) => {
    console.error(`Unmatched transfer route: ${req.method} ${req.originalUrl} (Auth: ${req.user ? 'YES' : 'NO'})`);
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
exports.default = router;
