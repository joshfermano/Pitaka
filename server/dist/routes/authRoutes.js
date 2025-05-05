"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.post('/register', controllers_1.authController.register);
router.post('/login', controllers_1.authController.login);
router.post('/logout', controllers_1.authController.logout);
// Protected routes
router.use(authMiddleware_1.protect);
// Get user profile
router
    .route('/profile')
    .get(controllers_1.authController.getProfile)
    .put(controllers_1.authController.updateProfile);
exports.default = router;
