import { Request, Response } from 'express';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { Transfer } from '../models/Transfer';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Make a deposit to an account
 * @route POST /api/transactions/deposit
 * @access Private
 */
export const deposit = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { accountId, amount, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Deposit amount must be greater than zero',
      });
    }

    const account = await Account.findOne({
      _id: accountId,
      userId,
    }).session(session);

    if (!account) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Update account balance
    account.balance += amount;
    await account.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'deposit',
          amount,
          description: description || 'Deposit',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Deposit successful',
      data: {
        transaction: transaction[0],
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process deposit',
      error: error.message,
    });
  }
};

/**
 * Make a withdrawal from an account
 * @route POST /api/transactions/withdraw
 * @access Private
 */
export const withdraw = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { accountId, amount, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Withdrawal amount must be greater than zero',
      });
    }

    const account = await Account.findOne({
      _id: accountId,
      userId,
    }).session(session);

    if (!account) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Check if sufficient balance
    if (account.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // Update account balance
    account.balance -= amount;
    await account.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'withdrawal',
          amount,
          description: description || 'Withdrawal',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Withdrawal successful',
      data: {
        transaction: transaction[0],
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message,
    });
  }
};

/**
 * Transfer money between accounts
 * @route POST /api/transactions/transfer
 * @access Private
 */
export const transfer = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { fromAccountId, toAccountId, amount, description } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(fromAccountId) ||
      !mongoose.Types.ObjectId.isValid(toAccountId)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Source and destination accounts cannot be the same',
      });
    }

    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Transfer amount must be greater than zero',
      });
    }

    // Check and update source account
    const sourceAccount = await Account.findOne({
      _id: fromAccountId,
      userId,
    }).session(session);

    if (!sourceAccount) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Source account not found',
      });
    }

    if (sourceAccount.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance in source account',
      });
    }

    // Check and update destination account
    const destAccount = await Account.findById(toAccountId).session(session);
    if (!destAccount) {
      return res.status(StatusCodes.NOT_FOUND).json({
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
    const transfer = await Transfer.create(
      [
        {
          userId,
          fromAccountId,
          toAccountId,
          amount,
          description: description || 'Transfer',
        },
      ],
      { session }
    );

    // Create transaction records for both accounts
    await Transaction.create(
      [
        {
          userId,
          accountId: fromAccountId,
          type: 'transfer_out',
          amount,
          description:
            description ||
            `Transfer to account ending in ${destAccount.accountNumber.slice(
              -4
            )}`,
          transferId: transfer[0]._id,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          userId: destAccount.userId,
          accountId: toAccountId,
          type: 'transfer_in',
          amount,
          description:
            description ||
            `Transfer from account ending in ${sourceAccount.accountNumber.slice(
              -4
            )}`,
          transferId: transfer[0]._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Transfer successful',
      data: {
        transfer: transfer[0],
        sourceAccountBalance: sourceAccount.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process transfer',
      error: error.message,
    });
  }
};

/**
 * Get all transactions for a user
 * @route GET /api/transactions
 * @access Private
 */
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, page = 1, accountId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };
    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

    const total = await Transaction.countDocuments(filter);

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
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
};

/**
 * Get a single transaction by ID
 * @route GET /api/transactions/:id
 * @access Private
 */
export const getTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid transaction ID',
      });
    }

    const transaction = await Transaction.findOne({ _id: id, userId })
      .populate('accountId', 'accountNumber name')
      .populate('transferId');

    if (!transaction) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { transaction },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message,
    });
  }
};
