"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawFromSavings = exports.depositToSavings = exports.getSavingsById = exports.getSavings = exports.createSavings = void 0;
const Savings_1 = __importStar(require("../models/Savings"));
const Account_1 = __importDefault(require("../models/Account"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Create a new savings goal
 * @route POST /api/savings
 * @access Private
 */
const createSavings = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { name, targetAmount, endDate, accountId, initialDeposit = 0, autoTransfer = { enabled: false, amount: 0, frequency: 'NONE' }, icon = 'piggy-bank', notes, } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid account ID',
            });
        }
        if (targetAmount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Target amount must be greater than zero',
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
        // Check if account has sufficient balance for initial deposit
        if (initialDeposit > 0 && account.balance < initialDeposit) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance for initial deposit',
            });
        }
        // Create savings goal
        const savings = await Savings_1.default.create([
            {
                userId,
                accountId,
                name,
                icon,
                currentAmount: initialDeposit,
                targetAmount,
                progress: initialDeposit > 0 ? (initialDeposit / targetAmount) * 100 : 0,
                endDate: endDate
                    ? new Date(endDate)
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year
                autoTransfer,
                notes,
                isActive: true,
            },
        ], { session });
        // If there's an initial deposit, update account balance and create transaction
        if (initialDeposit > 0) {
            account.balance -= initialDeposit;
            await account.save({ session });
            // Add transaction to savings
            savings[0].transactions.push({
                date: new Date(),
                amount: initialDeposit,
                type: Savings_1.SavingsTransactionType.DEPOSIT,
            });
            await savings[0].save({ session });
            // Create transaction record
            await Transaction_1.default.create([
                {
                    userId,
                    accountId,
                    type: 'savings-deposit',
                    amount: initialDeposit,
                    description: `Initial deposit for savings: ${name}`,
                    savingsId: savings[0]._id,
                },
            ], { session });
        }
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Savings goal created successfully',
            data: {
                savings: savings[0],
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to create savings goal',
            error: error.message,
        });
    }
};
exports.createSavings = createSavings;
/**
 * Get all savings goals for a user
 * @route GET /api/savings
 * @access Private
 */
const getSavings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { limit = 10, page = 1, isActive, accountId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter based on query params
        const filter = { userId };
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        if (accountId && mongoose_1.default.Types.ObjectId.isValid(accountId)) {
            filter.accountId = accountId;
        }
        const savingsGoals = await Savings_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('accountId', 'accountNumber name');
        const total = await Savings_1.default.countDocuments(filter);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: savingsGoals.length,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            data: { savings: savingsGoals },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch savings goals',
            error: error.message,
        });
    }
};
exports.getSavings = getSavings;
/**
 * Get a single savings goal by ID
 * @route GET /api/savings/:id
 * @access Private
 */
const getSavingsById = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid savings ID',
            });
        }
        const savings = await Savings_1.default.findOne({
            _id: id,
            userId,
        }).populate('accountId', 'accountNumber name');
        if (!savings) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Savings goal not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { savings },
        });
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch savings goal',
            error: error.message,
        });
    }
};
exports.getSavingsById = getSavingsById;
/**
 * Deposit to a savings goal
 * @route POST /api/savings/:id/deposit
 * @access Private
 */
const depositToSavings = async (req, res) => {
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
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Deposit amount must be greater than zero',
            });
        }
        // Check if savings goal exists and belongs to user
        const savings = await Savings_1.default.findOne({
            _id: id,
            userId,
            isActive: true,
        }).session(session);
        if (!savings) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Active savings goal not found',
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
        // Update account balance
        account.balance -= amount;
        await account.save({ session });
        // Update savings goal
        savings.currentAmount += amount;
        // Add transaction to savings
        savings.transactions.push({
            date: new Date(),
            amount,
            type: Savings_1.SavingsTransactionType.DEPOSIT,
        });
        await savings.save({ session });
        // Create transaction record
        await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'savings-deposit',
                amount,
                description: `Deposit to savings: ${savings.name}`,
                savingsId: savings._id,
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Deposit to savings goal successful',
            data: {
                savings,
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to deposit to savings goal',
            error: error.message,
        });
    }
};
exports.depositToSavings = depositToSavings;
/**
 * Withdraw from a savings goal
 * @route POST /api/savings/:id/withdraw
 * @access Private
 */
const withdrawFromSavings = async (req, res) => {
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
        if (amount <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Withdrawal amount must be greater than zero',
            });
        }
        // Check if savings goal exists and belongs to user
        const savings = await Savings_1.default.findOne({
            _id: id,
            userId,
            isActive: true,
        }).session(session);
        if (!savings) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Active savings goal not found',
            });
        }
        // Check if savings has sufficient amount
        if (savings.currentAmount < amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient savings balance',
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
        // Update savings goal
        savings.currentAmount -= amount;
        // Add transaction to savings
        savings.transactions.push({
            date: new Date(),
            amount,
            type: Savings_1.SavingsTransactionType.WITHDRAWAL,
        });
        await savings.save({ session });
        // Update account balance
        account.balance += amount;
        await account.save({ session });
        // Create transaction record
        await Transaction_1.default.create([
            {
                userId,
                accountId,
                type: 'savings-withdrawal',
                amount,
                description: `Withdrawal from savings: ${savings.name}`,
                savingsId: savings._id,
            },
        ], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Withdrawal from savings goal successful',
            data: {
                savings,
                newBalance: account.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to withdraw from savings goal',
            error: error.message,
        });
    }
};
exports.withdrawFromSavings = withdrawFromSavings;
