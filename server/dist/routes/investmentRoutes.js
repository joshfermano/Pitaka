"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const investmentController_1 = require("../controllers/investmentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// All routes are protected
router.use(authMiddleware_1.protect);
// Companies routes
router.get('/companies', investmentController_1.getAllCompanies);
router.get('/companies/:companyId', investmentController_1.getCompanyById);
// Investments routes
router.get('/user', investmentController_1.getUserInvestments);
router.get('/user/:investmentId', investmentController_1.getInvestmentById);
router.post('/buy', investmentController_1.buyShares);
router.post('/sell', investmentController_1.sellShares);
router.get('/performance', investmentController_1.getPerformance);
exports.default = router;
