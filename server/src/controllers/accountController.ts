import { Request, Response } from 'express';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Get all accounts for a user
 * @route GET /api/accounts
 * @access Private
 */
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const accounts = await Account.find({ userId });

    res.status(StatusCodes.OK).json({
      success: true,
      count: accounts.length,
      data: { accounts },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch accounts',
      error: error.message,
    });
  }
};

/**
 * Get a single account by ID
 * @route GET /api/accounts/:id
 * @access Private
 */
export const getAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    const account = await Account.findOne({ _id: id, userId });

    if (!account) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { account },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch account',
      error: error.message,
    });
  }
};

/**
 * Create a new account
 * @route POST /api/accounts
 * @access Private
 */
export const createAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type, name, initialBalance = 0 } = req.body;

    const account = await Account.create({
      userId,
      type,
      name,
      balance: initialBalance,
      accountNumber: await Account.generateAccountNumber(),
    });

    // Create initial deposit transaction if balance > 0
    if (initialBalance > 0) {
      await Transaction.create({
        userId,
        accountId: account._id,
        type: 'deposit',
        amount: initialBalance,
        description: 'Initial deposit',
      });
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Account created successfully',
      data: { account },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create account',
      error: error.message,
    });
  }
};

/**
 * Get account balance
 * @route GET /api/accounts/:id/balance
 * @access Private
 */
export const getAccountBalance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    const account = await Account.findOne({ _id: id, userId }).select(
      'balance accountNumber name type'
    );

    if (!account) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        accountId: account._id,
        accountNumber: account.accountNumber,
        name: account.name,
        type: account.type,
        balance: account.balance,
      },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch account balance',
      error: error.message,
    });
  }
};

/**
 * Get account transactions
 * @route GET /api/accounts/:id/transactions
 * @access Private
 */
export const getAccountTransactions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { limit = 10, page = 1 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    const account = await Account.findOne({ _id: id, userId });
    if (!account) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    const transactions = await Transaction.find({ accountId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments({ accountId: id });

    res.status(StatusCodes.OK).json({
      success: true,
      count: transactions.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: { transactions },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch account transactions',
      error: error.message,
    });
  }
};
