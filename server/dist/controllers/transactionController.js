"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransaction = exports.getTransactions = exports.transfer = exports.withdraw = exports.deposit = void 0;
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Transfer_1 = require("../models/Transfer");
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Make a deposit to an account
 * @route POST /api/transactions/deposit
 * @access Private
 */
const deposit = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { accountId, amount, description } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Deposit amount must be greater than zero',
            });
        }
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
        // Update account balance
        account.balance += amount;
        await account.save({ session });
        // Create transaction record
        const transaction = await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'deposit',
                amount,
                description: description || 'Deposit',
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Deposit successful',
            data: {
                transaction: transaction[0],
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process deposit',
            error: error.message,
        });
    }
};
exports.deposit = deposit;
/**
 * Make a withdrawal from an account
 * @route POST /api/transactions/withdraw
 * @access Private
 */
const withdraw = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { accountId, amount, description } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Withdrawal amount must be greater than zero',
            });
        }
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
        // Check if sufficient balance
        if (account.balance < amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Update account balance
        account.balance -= amount;
        await account.save({ session });
        // Create transaction record
        const transaction = await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'withdrawal',
                amount,
                description: description || 'Withdrawal',
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Withdrawal successful',
            data: {
                transaction: transaction[0],
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process withdrawal',
            error: error.message,
        });
    }
};
exports.withdraw = withdraw;
/**
 * Transfer money between accounts
 * @route POST /api/transactions/transfer
 * @access Private
 */
const transfer = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { fromAccountId, toAccountId, amount, description } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(fromAccountId) ||
            !mongoose_1.default.Types.ObjectId.isValid(toAccountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (fromAccountId === toAccountId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Source and destination accounts cannot be the same',
            });
        }
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Transfer amount must be greater than zero',
            });
        }
        // Check and update source account
        const sourceAccount = await Account_1.default.findOne({
            _id: fromAccountId,
            userId,
        }).session(session);
        if (!sourceAccount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Source account not found',
            });
        }
        if (sourceAccount.balance < amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance in source account',
            });
        }
        // Check and update destination account
        const destAccount = await Account_1.default.findById(toAccountId).session(session);
        if (!destAccount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Destination account not found',
            });
        }
        // Update balances
        sourceAccount.balance -= amount;
        destAccount.balance += amount;
        await sourceAccount.save({ session });
        await destAccount.save({ session });
        // Create transfer record
        const transfer = await Transfer_1.Transfer.create([
            {
                userId,
                fromAccountId,
                toAccountId,
                amount,
                description: description || 'Transfer',
            },
        ], { session });
        // Create transaction records for both accounts
        await Transaction_1.default.create([
            {
                userId,
                accountId: fromAccountId,
                type: 'transfer_out',
                amount,
                description: description ||
                    `Transfer to account ending in ${destAccount.accountNumber.slice(-4)}`,
                transferId: transfer[0]._id,
            },
        ], { session });
        await Transaction_1.default.create([
            {
                userId: destAccount.userId,
                accountId: toAccountId,
                type: 'transfer_in',
                amount,
                description: description ||
                    `Transfer from account ending in ${sourceAccount.accountNumber.slice(-4)}`,
                transferId: transfer[0]._id,
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Transfer successful',
            data: {
                transfer: transfer[0],
                sourceAccountBalance: sourceAccount.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process transfer',
            error: error.message,
        });
    }
};
exports.transfer = transfer;
/**
 * Get all transactions for a user
 * @route GET /api/transactions
 * @access Private
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limit = 10, page = 1, accountId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter based on query params
        const filter = { userId };
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const transactions = await Transaction_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('accountId', 'accountNumber name');
        const total = await Transaction_1.default.countDocuments(filter);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: transactions.length,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            data: { transactions },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message,
        });
    }
};
exports.getTransactions = getTransactions;
/**
 * Get a single transaction by ID
 * @route GET /api/transactions/:id
 * @access Private
 */
const getTransaction = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid transaction ID',
            });
        }
        const transaction = await Transaction_1.default.findOne({ _id: id, userId })
            .populate('accountId', 'accountNumber name')
            .populate('transferId');
        if (!transaction) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Transaction not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { transaction },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch transaction',
            error: error.message,
        });
    }
};
exports.getTransaction = getTransaction;
