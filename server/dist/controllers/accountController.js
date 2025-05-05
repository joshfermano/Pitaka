"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountTransactions = exports.getAccountBalance = exports.createAccount = exports.getAccount = exports.getAccounts = void 0;
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get all accounts for a user
 * @route GET /api/accounts
 * @access Private
 */
const getAccounts = async (req, res) => {
    try {
        const userId = req.user?.id;
        const accounts = await Account_1.default.find({ userId });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: accounts.length,
            data: { accounts },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch accounts',
            error: error.message,
        });
    }
};
exports.getAccounts = getAccounts;
/**
 * Get a single account by ID
 * @route GET /api/accounts/:id
 * @access Private
 */
const getAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        const account = await Account_1.default.findOne({ _id: id, userId });
        if (!account) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { account },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch account',
            error: error.message,
        });
    }
};
exports.getAccount = getAccount;
/**
 * Create a new account
 * @route POST /api/accounts
 * @access Private
 */
const createAccount = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, name, initialBalance = 0 } = req.body;
        const account = await Account_1.default.create({
            userId,
            type,
            name,
            balance: initialBalance,
            accountNumber: await Account_1.default.generateAccountNumber(),
        });
        // Create initial deposit transaction if balance > 0
        if (initialBalance > 0) {
            await Transaction_1.default.create({
                userId,
                accountId: account._id,
                type: 'deposit',
                amount: initialBalance,
                description: 'Initial deposit',
            });
        }
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Account created successfully',
            data: { account },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to create account',
            error: error.message,
        });
    }
};
exports.createAccount = createAccount;
/**
 * Get account balance
 * @route GET /api/accounts/:id/balance
 * @access Private
 */
const getAccountBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        const account = await Account_1.default.findOne({ _id: id, userId }).select('balance accountNumber name type');
        if (!account) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                accountId: account._id,
                accountNumber: account.accountNumber,
                name: account.name,
                type: account.type,
                balance: account.balance,
            },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch account balance',
            error: error.message,
        });
    }
};
exports.getAccountBalance = getAccountBalance;
/**
 * Get account transactions
 * @route GET /api/accounts/:id/transactions
 * @access Private
 */
const getAccountTransactions = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { limit = 10, page = 1 } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        const account = await Account_1.default.findOne({ _id: id, userId });
        if (!account) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        const transactions = await Transaction_1.default.find({ accountId: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        const total = await Transaction_1.default.countDocuments({ accountId: id });
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
            message: 'Failed to fetch account transactions',
            error: error.message,
        });
    }
};
exports.getAccountTransactions = getAccountTransactions;
