"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayment = exports.getPayment = exports.getPayments = exports.createPayment = void 0;
const Payment_1 = require("../models/Payment");
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
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
        const { accountId, billerId, billerName, accountNumber, amount, fee = 0, description, } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (amount <= 0) {
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
        // Check if account has sufficient balance
        const totalAmount = amount + fee;
        if (account.balance < totalAmount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Generate reference number
        const referenceNumber = Payment_1.Payment.generateReferenceNumber();
        // Create payment record with initial status
        const payment = await Payment_1.Payment.create([
            {
                userId,
                accountId,
                billerId,
                billerName,
                accountNumber,
                amount,
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
                type: 'payment',
                amount: totalAmount,
                description: description || `Payment to ${billerName}`,
                paymentId: payment[0]._id,
            },
        ], { session });
        // Update payment with transaction ID and mark as completed
        if (transaction[0]?._id) {
            payment[0].transactionId = transaction[0]._id;
        }
        payment[0].status = 'COMPLETED';
        await payment[0].save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                payment: payment[0],
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
        const { limit = 10, page = 1, status, accountId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter based on query params
        const filter = { userId };
        if (status &&
            ['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
            filter.status = status;
        }
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const payments = await Payment_1.Payment.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('accountId', 'accountNumber name');
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
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid payment ID',
            });
        }
        const payment = await Payment_1.Payment.findOne({ _id: id, userId }).populate('accountId', 'accountNumber name');
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
