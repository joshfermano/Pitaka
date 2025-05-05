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
// Loan routes
router
    .route('/')
    .get(controllers_1.loanController.getLoans)
    .post(controllers_1.loanController.applyForLoan);
router.route('/:id').get(controllers_1.loanController.getLoan);
router.post('/:id/payment', controllers_1.loanController.makeLoanPayment);
router.get('/:id/payments', controllers_1.loanController.getLoanPayments);
exports.default = router;
