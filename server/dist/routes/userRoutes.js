"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all user routes
router.use(authMiddleware_1.protect);
// User profile routes
router
    .route('/profile')
    .get(userController_1.getUserProfile)
    .put(userController_1.updateUserProfile);
// User settings routes
router
    .route('/settings')
    .get(userController_1.getUserSettings)
    .put(userController_1.updateUserSettings);
// Search users
router.get('/search', userController_1.searchUsers);
// Get user by ID
router.get('/:id', userController_1.getUserById);
exports.default = router;
