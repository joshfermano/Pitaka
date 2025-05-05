"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoanPayments = exports.makeLoanPayment = exports.getLoan = exports.getLoans = exports.applyForLoan = void 0;
const Loan_1 = require("../models/Loan");
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Apply for a new loan
 * @route POST /api/loans
 * @access Private
 */
const applyForLoan = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { amount, term, purpose, accountId, interestRate = 0.05, // Default interest rate 5%
        loanProductId, title, disbursementDate = new Date(), nextPayment = amount * 0.1, // Default 10% of loan amount
        dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
        paymentFrequency = 'MONTHLY', } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(loanProductId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid loan product ID',
            });
        }
        // Validate loan amount
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Loan amount must be greater than zero',
            });
        }
        // Check if account exists and belongs to user
        const account = await Account_1.default.findOne({
            _id: accountId,
            userId,
        }).session(session);
        if (!account) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        // Create loan application
        const loan = await Loan_1.Loan.create([
            {
                userId,
                loanProductId,
                title,
                amount,
                paid: 0,
                remaining: amount,
                nextPayment,
                dueDate,
                disbursementDate,
                term,
                interest: `${interestRate * 100}%`,
                status: 'PENDING',
                paymentFrequency,
                accountNumber: account.accountNumber,
                payments: [],
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Loan application submitted successfully',
            data: {
                loan: loan[0],
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process loan application',
            error: error.message,
        });
    }
};
exports.applyForLoan = applyForLoan;
/**
 * Get all loans for a user
 * @route GET /api/loans
 * @access Private
 */
const getLoans = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limit = 10, page = 1, status, accountId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter based on query params
        const filter = { userId };
        if (status &&
            ['pending', 'approved', 'rejected', 'active', 'closed'].includes(status)) {
            filter.status = status;
        }
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const loans = await Loan_1.Loan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('accountId', 'accountNumber name');
        const total = await Loan_1.Loan.countDocuments(filter);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: loans.length,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            data: { loans },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch loans',
            error: error.message,
        });
    }
};
exports.getLoans = getLoans;
/**
 * Get a single loan by ID
 * @route GET /api/loans/:id
 * @access Private
 */
const getLoan = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid loan ID',
            });
        }
        const loan = await Loan_1.Loan.findOne({ _id: id, userId }).populate('accountId', 'accountNumber name');
        if (!loan) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Loan not found',
            });
        }
        // Calculate progress
        const progress = loan.calculateProgress();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                loan,
                progress,
            },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch loan',
            error: error.message,
        });
    }
};
exports.getLoan = getLoan;
/**
 * Make a loan payment
 * @route POST /api/loans/:id/payment
 * @access Private
 */
const makeLoanPayment = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { amount, accountId } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id) ||
            !mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid ID format',
            });
        }
        // Validate payment amount
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Payment amount must be greater than zero',
            });
        }
        // Find loan
        const loan = await Loan_1.Loan.findOne({
            _id: id,
            userId,
            status: { $in: ['APPROVED', 'ACTIVE'] },
        }).session(session);
        if (!loan) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Active loan not found',
            });
        }
        // Check if account exists and belongs to user
        const account = await Account_1.default.findOne({
            _id: accountId,
            userId,
        }).session(session);
        if (!account) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        // Check if account has sufficient balance
        if (account.balance < amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Deduct amount from account
        account.balance -= amount;
        await account.save({ session });
        // Apply payment to loan
        loan.applyPayment(amount);
        await loan.save({ session });
        // Create transaction record
        await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'loan-payment',
                amount,
                description: `Loan payment - Reference: ${loan._id ? loan._id.toString().substring(0, 8) : 'Unknown'}`,
                loanId: loan._id,
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Loan payment processed successfully',
            data: {
                loan,
                newBalance: account.balance,
                remainingLoanAmount: loan.remaining,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process loan payment',
            error: error.message,
        });
    }
};
exports.makeLoanPayment = makeLoanPayment;
/**
 * Get loan payment history
 * @route GET /api/loans/:id/payments
 * @access Private
 */
const getLoanPayments = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid loan ID',
            });
        }
        const loan = await Loan_1.Loan.findOne({ _id: id, userId });
        if (!loan) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Loan not found',
            });
        }
        // Get related transactions
        const payments = await Transaction_1.default.find({
            loanId: id,
            type: 'loan-payment',
        }).sort({ createdAt: -1 });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: payments.length,
            data: { payments },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch loan payments',
            error: error.message,
        });
    }
};
exports.getLoanPayments = getLoanPayments;
