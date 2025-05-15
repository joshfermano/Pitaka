"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoanPayments = exports.makeLoanPayment = exports.getLoan = exports.getLoans = exports.applyForLoan = exports.getLoanProductById = exports.getLoanProducts = void 0;
const Loan_1 = require("../models/Loan");
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get all loan products
 * @route GET /api/loans/products
 * @access Public
 */
const getLoanProducts = async (req, res) => {
    try {
        const loanProducts = await Loan_1.LoanProduct.find({ isActive: true }).sort({
            title: 1,
        });
        if (loanProducts.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                data: { loanProducts: [] },
                message: 'No loan products found. Please seed the database first.',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: loanProducts.length,
            data: { loanProducts },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch loan products',
            error: error.message,
        });
    }
};
exports.getLoanProducts = getLoanProducts;
/**
 * Get loan product by ID
 * @route GET /api/loans/products/:id
 * @access Public
 */
const getLoanProductById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid loan product ID',
            });
        }
        const loanProduct = await Loan_1.LoanProduct.findOne({ _id: id, isActive: true });
        if (!loanProduct) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Loan product not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { loanProduct },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch loan product',
            error: error.message,
        });
    }
};
exports.getLoanProductById = getLoanProductById;
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
        const { amount, term, purpose, accountId, loanProductId, paymentFrequency = 'MONTHLY', } = req.body;
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
        // Get loan product details
        const loanProduct = await Loan_1.LoanProduct.findById(loanProductId);
        if (!loanProduct) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Loan product not found',
            });
        }
        // Validate against loan product constraints
        if (amount < loanProduct.minAmount || amount > loanProduct.maxAmount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Loan amount must be between ${loanProduct.minAmount} and ${loanProduct.maxAmount}`,
            });
        }
        // Extract interest rate from loan product
        const interestRateStr = loanProduct.interest;
        const interestRate = parseFloat(interestRateStr.replace(/[^0-9.]/g, '')) / 100; // Convert "10.5% p.a." to 0.105
        // Calculate due date and next payment based on the loan terms
        const disbursementDate = new Date();
        const dueDate = new Date();
        // Parse the term string to determine payment schedule
        const termParts = loanProduct.term.split('-');
        const maxTerm = parseInt(termParts[termParts.length - 1]);
        const termUnit = termParts[termParts.length - 1].includes('month')
            ? 'months'
            : 'years';
        // Set due date based on term
        if (termUnit === 'months') {
            dueDate.setMonth(dueDate.getMonth() + (term || maxTerm));
        }
        else {
            dueDate.setFullYear(dueDate.getFullYear() + (term || maxTerm));
        }
        // Calculate monthly payment amount (simple approximation)
        const monthlyInterest = interestRate / 12;
        const totalMonths = termUnit === 'months' ? term || maxTerm : (term || maxTerm) * 12;
        const monthlyPayment = (amount *
            (monthlyInterest * Math.pow(1 + monthlyInterest, totalMonths))) /
            (Math.pow(1 + monthlyInterest, totalMonths) - 1);
        // Create loan application
        const loan = await Loan_1.Loan.create([
            {
                userId,
                loanProductId,
                title: loanProduct.title,
                amount,
                paid: 0,
                remaining: amount,
                nextPayment: Math.round(monthlyPayment * 100) / 100, // Round to 2 decimal places
                dueDate,
                progress: 0,
                disbursementDate,
                term: `${term || maxTerm} ${termUnit}`,
                interest: loanProduct.interest,
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
            [
                'PENDING',
                'APPROVED',
                'REJECTED',
                'ACTIVE',
                'COMPLETED',
                'CANCELLED',
            ].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const loans = await Loan_1.Loan.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('loanProductId', 'title icon color'); // Populate with loan product details
        if (loans.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                totalPages: 0,
                currentPage: pageNum,
                data: { loans: [] },
            });
        }
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
        const loan = await Loan_1.Loan.findOne({ _id: id, userId })
            .populate('loanProductId')
            .populate('payments');
        if (!loan) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Loan not found',
            });
        }
        // Calculate progress
        loan.calculateProgress();
        await loan.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                loan,
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
        // Create payment record
        const payment = await Loan_1.LoanPayment.create([
            {
                loanId: loan._id,
                amount,
                date: new Date(),
                status: 'COMPLETED',
            },
        ], { session });
        // Apply payment to loan
        loan.paid += amount;
        loan.remaining -= amount;
        loan.payments.push(payment[0]._id);
        // Calculate new progress
        loan.calculateProgress();
        // Update loan status if fully paid
        if (loan.remaining <= 0) {
            loan.status = 'COMPLETED';
            loan.remaining = 0;
            loan.progress = 100;
        }
        else if (loan.status === 'APPROVED') {
            loan.status = 'ACTIVE';
        }
        await loan.save({ session });
        // Create transaction record
        await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'LOAN_PAYMENT',
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
                payment: payment[0],
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
        // Get payments from the loan's payments array
        const payments = await Loan_1.LoanPayment.find({
            _id: { $in: loan.payments },
        }).sort({ date: -1 });
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
