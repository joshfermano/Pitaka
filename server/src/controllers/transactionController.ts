import { Request, Response } from 'express';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { Transfer } from '../models/Transfer';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { TransactionType, TransactionStatus } from '../models/Transaction';

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
    const { accountId, amount, description, method, referenceNumber } =
      req.body;

    console.log('Deposit request received:', {
      accountId,
      amount,
      description,
      method,
      referenceNumber,
      userId,
    });

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

    // Prepare transaction description with deposit method and reference if provided
    let finalDescription = description || 'Deposit';
    if (method && !finalDescription.includes(method)) {
      finalDescription = `${method} ${finalDescription}`;
    }
    if (referenceNumber && !finalDescription.includes(referenceNumber)) {
      finalDescription = `${finalDescription} (Ref: ${referenceNumber})`;
    }

    // Generate a transaction ID
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId,
          accountId,
          transactionId,
          type: TransactionType.DEPOSIT, // Use the enum value
          amount,
          description: finalDescription,
          status: TransactionStatus.COMPLETED, // Mark as completed
          date: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log('Deposit successful:', {
      transactionId: transaction[0].transactionId,
      newBalance: account.balance,
    });

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

    console.error('Deposit error:', error);
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
    const { accountId, amount, description, method } = req.body;

    console.log('Withdrawal request received:', {
      userId,
      accountId,
      amount,
      description,
      method,
    });

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

    // Prepare withdrawal description with method if provided
    let finalDescription = description || 'Withdrawal';
    if (method && !finalDescription.includes(method)) {
      finalDescription = `${method} ${finalDescription}`;
    }

    // Generate a transaction ID
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId,
          accountId,
          transactionId,
          type: TransactionType.WITHDRAWAL,
          amount,
          description: finalDescription,
          status: TransactionStatus.COMPLETED,
          date: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log('Withdrawal successful:', {
      transactionId: transaction[0].transactionId,
      newBalance: account.balance,
    });

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

    console.error('Withdrawal error:', error);
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

    console.log('Transfer request received:', {
      userId,
      fromAccountId,
      toAccountId,
      amount,
      description,
    });

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

    // Generate transaction ID for the transfer
    const transferId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;

    // Prepare descriptions
    const sourceDescription =
      description ||
      `Transfer to account ending in ${destAccount.accountNumber.slice(-4)}`;
    const destDescription =
      description ||
      `Received from account ending in ${sourceAccount.accountNumber.slice(
        -4
      )}`;

    // Create transfer record
    const transfer = await Transfer.create(
      [
        {
          userId,
          fromAccountId,
          toAccountId,
          amount,
          description: sourceDescription,
          reference: transferId,
          status: 'COMPLETED',
        },
      ],
      { session }
    );

    // Create transaction records for both accounts
    const outgoingTransaction = await Transaction.create(
      [
        {
          userId,
          accountId: fromAccountId,
          transactionId: `OUT${transferId}`,
          type: TransactionType.TRANSFER,
          amount,
          description: sourceDescription,
          transferId: transfer[0]._id,
          status: TransactionStatus.COMPLETED,
          date: new Date(),
        },
      ],
      { session }
    );

    const incomingTransaction = await Transaction.create(
      [
        {
          userId: destAccount.userId,
          accountId: toAccountId,
          transactionId: `IN${transferId}`,
          type: TransactionType.TRANSFER_RECEIVED,
          amount,
          description: destDescription,
          transferId: transfer[0]._id,
          status: TransactionStatus.COMPLETED,
          date: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log('Transfer successful:', {
      transferId: transfer[0].reference,
      sourceBalance: sourceAccount.balance,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Transfer successful',
      data: {
        transfer: transfer[0],
        sourceAccountBalance: sourceAccount.balance,
        transactions: {
          outgoing: outgoingTransaction[0],
          incoming: incomingTransaction[0],
        },
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Transfer error:', error);
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

/**
 * Get recent transactions for a user
 * @route GET /api/transactions/recent
 * @access Private
 */
export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 5 } = req.query;

    // Set cache control headers to prevent caching
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const limitNum = parseInt(limit as string, 10);

    // Find the most recent transactions for this user
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

    res.status(StatusCodes.OK).json({
      success: true,
      count: transactions.length,
      data: { transactions },
    });
  } catch (error: any) {
    console.error('Error fetching recent transactions:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch recent transactions',
      error: error.message,
    });
  }
};
