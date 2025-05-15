"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayment = exports.getPayment = exports.getPayments = exports.createPayment = exports.getBillerById = exports.getPopularBillers = exports.getBillersByCategory = exports.getAllBillers = void 0;
const Payment_1 = require("../models/Payment");
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get all billers
 * @route GET /api/payments/billers
 * @access Public
 */
const getAllBillers = async (req, res) => {
    try {
        const billers = await Payment_1.Biller.find({ isActive: true }).sort({ name: 1 });
        if (billers.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                data: { billers: [] },
                message: 'No billers found. Please seed the database first.',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: billers.length,
            data: { billers },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch billers',
            error: error.message,
        });
    }
};
exports.getAllBillers = getAllBillers;
/**
 * Get billers by category
 * @route GET /api/payments/billers/category/:category
 * @access Public
 */
const getBillersByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        // Validate category
        const validCategories = [
            'ELECTRICITY',
            'WATER',
            'INTERNET',
            'ENTERTAINMENT',
            'INSURANCE',
            'TELECOM',
            'OTHERS',
        ];
        if (!validCategories.includes(category.toUpperCase())) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid category',
            });
        }
        const billers = await Payment_1.Biller.find({
            category: category.toUpperCase(),
            isActive: true,
        }).sort({ name: 1 });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: billers.length,
            data: { billers },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch billers by category',
            error: error.message,
        });
    }
};
exports.getBillersByCategory = getBillersByCategory;
/**
 * Get popular billers
 * @route GET /api/payments/billers/popular
 * @access Public
 */
const getPopularBillers = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '5', 10);
        const billers = await Payment_1.Biller.find({
            isActive: true,
            popularIndex: { $exists: true },
        })
            .sort({ popularIndex: 1 })
            .limit(limit);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: billers.length,
            data: { billers },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch popular billers',
            error: error.message,
        });
    }
};
exports.getPopularBillers = getPopularBillers;
/**
 * Get biller by ID
 * @route GET /api/payments/billers/:id
 * @access Public
 */
const getBillerById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid biller ID',
            });
        }
        const biller = await Payment_1.Biller.findOne({ _id: id, isActive: true });
        if (!biller) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Biller not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { biller },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch biller',
            error: error.message,
        });
    }
};
exports.getBillerById = getBillerById;
/**
 * Create a new payment
 * @route POST /api/payments
 * @access Private
 */
const createPayment = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { accountId, billerId, accountNumber, amount, description } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(billerId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid biller ID',
            });
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Payment amount must be greater than zero',
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
        // Fetch biller details
        const biller = await Payment_1.Biller.findById(billerId);
        if (!biller) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Biller not found',
            });
        }
        // Validate payment amount against biller constraints
        if (amountNum < biller.minimumAmount || amountNum > biller.maximumAmount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Payment amount must be between ${biller.minimumAmount} and ${biller.maximumAmount}`,
            });
        }
        // Calculate convenience fee if applicable
        const fee = biller.convenienceFee || 0;
        const totalAmount = amountNum + fee;
        // Check if account has sufficient balance
        if (account.balance < totalAmount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Generate reference number
        const referenceNumber = Payment_1.Payment.generateReferenceNumber();
        // Create payment record with initial status
        const paymentRecord = await Payment_1.Payment.create([
            {
                userId,
                accountId,
                billerId,
                billerName: biller.name,
                accountNumber,
                amount: amountNum,
                fee,
                status: 'PENDING',
                referenceNumber,
            },
        ], { session });
        // Update account balance
        account.balance -= totalAmount;
        await account.save({ session });
        // Create transaction record
        const transaction = await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'PAYMENT',
                amount: totalAmount,
                description: description || `Payment to ${biller.name}`,
                paymentId: paymentRecord[0]._id,
            },
        ], { session });
        // Update payment with transaction ID and mark as completed
        if (transaction[0]?._id) {
            paymentRecord[0].transactionId = transaction[0]
                ._id;
        }
        paymentRecord[0].status = 'COMPLETED';
        await paymentRecord[0].save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                payment: paymentRecord[0],
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process payment',
            error: error.message,
        });
    }
};
exports.createPayment = createPayment;
/**
 * Get all payments for a user
 * @route GET /api/payments
 * @access Private
 */
const getPayments = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const { limit = 10, page = 1, status, accountId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter based on query params
        const filter = { userId };
        if (status &&
            ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status.toUpperCase())) {
            filter.status = status.toUpperCase();
        }
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const payments = await Payment_1.Payment.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('accountId', 'accountNumber name')
            .populate('billerId', 'name logo category');
        if (payments.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                totalPages: 0,
                currentPage: pageNum,
                data: { payments: [] },
            });
        }
        const total = await Payment_1.Payment.countDocuments(filter);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: payments.length,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            data: { payments },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch payments',
            error: error.message,
        });
    }
};
exports.getPayments = getPayments;
/**
 * Get a single payment by ID
 * @route GET /api/payments/:id
 * @access Private
 */
const getPayment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid payment ID',
            });
        }
        const payment = await Payment_1.Payment.findOne({ _id: id, userId })
            .populate('accountId', 'accountNumber name')
            .populate('billerId', 'name logo category accountNumberLabel');
        if (!payment) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Payment not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { payment },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch payment',
            error: error.message,
        });
    }
};
exports.getPayment = getPayment;
/**
 * Cancel a scheduled payment
 * @route PATCH /api/payments/:id/cancel
 * @access Private
 */
const cancelPayment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid payment ID',
            });
        }
        const payment = await Payment_1.Payment.findOne({
            _id: id,
            userId,
            status: 'PENDING',
        });
        if (!payment) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Pending payment not found',
            });
        }
        // Cancel the payment
        payment.status = 'FAILED';
        await payment.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Payment cancelled successfully',
            data: { payment },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to cancel payment',
            error: error.message,
        });
    }
};
exports.cancelPayment = cancelPayment;
