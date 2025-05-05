import { Request, Response } from 'express';
import Savings, { SavingsTransactionType } from '../models/Savings';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Create a new savings goal
 * @route POST /api/savings
 * @access Private
 */
export const createSavings = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const {
      name,
      targetAmount,
      endDate,
      accountId,
      initialDeposit = 0,
      autoTransfer = { enabled: false, amount: 0, frequency: 'NONE' },
      icon = 'piggy-bank',
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (targetAmount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Target amount must be greater than zero',
      });
    }

    // Check if account exists and belongs to user
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

    // Check if account has sufficient balance for initial deposit
    if (initialDeposit > 0 && account.balance < initialDeposit) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance for initial deposit',
      });
    }

    // Create savings goal
    const savings = await Savings.create(
      [
        {
          userId,
          accountId,
          name,
          icon,
          currentAmount: initialDeposit,
          targetAmount,
          progress:
            initialDeposit > 0 ? (initialDeposit / targetAmount) * 100 : 0,
          endDate: endDate
            ? new Date(endDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year
          autoTransfer,
          notes,
          isActive: true,
        },
      ],
      { session }
    );

    // If there's an initial deposit, update account balance and create transaction
    if (initialDeposit > 0) {
      account.balance -= initialDeposit;
      await account.save({ session });

      // Add transaction to savings
      savings[0].transactions.push({
        date: new Date(),
        amount: initialDeposit,
        type: SavingsTransactionType.DEPOSIT,
      });
      await savings[0].save({ session });

      // Create transaction record
      await Transaction.create(
        [
          {
            userId,
            accountId,
            type: 'savings-deposit',
            amount: initialDeposit,
            description: `Initial deposit for savings: ${name}`,
            savingsId: savings[0]._id,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Savings goal created successfully',
      data: {
        savings: savings[0],
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create savings goal',
      error: error.message,
    });
  }
};

/**
 * Get all savings goals for a user
 * @route GET /api/savings
 * @access Private
 */
export const getSavings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, page = 1, isActive, accountId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    const savingsGoals = await Savings.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

    const total = await Savings.countDocuments(filter);

    res.status(StatusCodes.OK).json({
      success: true,
      count: savingsGoals.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: { savings: savingsGoals },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch savings goals',
      error: error.message,
    });
  }
};

/**
 * Get a single savings goal by ID
 * @route GET /api/savings/:id
 * @access Private
 */
export const getSavingsById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid savings ID',
      });
    }

    const savings = await Savings.findOne({
      _id: id,
      userId,
    }).populate('accountId', 'accountNumber name');

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Savings goal not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { savings },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch savings goal',
      error: error.message,
    });
  }
};

/**
 * Deposit to a savings goal
 * @route POST /api/savings/:id/deposit
 * @access Private
 */
export const depositToSavings = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, accountId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid ID format',
      });
    }

    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Deposit amount must be greater than zero',
      });
    }

    // Check if savings goal exists and belongs to user
    const savings = await Savings.findOne({
      _id: id,
      userId,
      isActive: true,
    }).session(session);

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Active savings goal not found',
      });
    }

    // Check if account exists and belongs to user
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

    // Check if account has sufficient balance
    if (account.balance < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
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
      type: SavingsTransactionType.DEPOSIT,
    });

    await savings.save({ session });

    // Create transaction record
    await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'savings-deposit',
          amount,
          description: `Deposit to savings: ${savings.name}`,
          savingsId: savings._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Deposit to savings goal successful',
      data: {
        savings,
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to deposit to savings goal',
      error: error.message,
    });
  }
};

/**
 * Withdraw from a savings goal
 * @route POST /api/savings/:id/withdraw
 * @access Private
 */
export const withdrawFromSavings = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { amount, accountId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(accountId)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid ID format',
      });
    }

    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Withdrawal amount must be greater than zero',
      });
    }

    // Check if savings goal exists and belongs to user
    const savings = await Savings.findOne({
      _id: id,
      userId,
      isActive: true,
    }).session(session);

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Active savings goal not found',
      });
    }

    // Check if savings has sufficient amount
    if (savings.currentAmount < amount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient savings balance',
      });
    }

    // Check if account exists and belongs to user
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

    // Update savings goal
    savings.currentAmount -= amount;

    // Add transaction to savings
    savings.transactions.push({
      date: new Date(),
      amount,
      type: SavingsTransactionType.WITHDRAWAL,
    });

    await savings.save({ session });

    // Update account balance
    account.balance += amount;
    await account.save({ session });

    // Create transaction record
    await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'savings-withdrawal',
          amount,
          description: `Withdrawal from savings: ${savings.name}`,
          savingsId: savings._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Withdrawal from savings goal successful',
      data: {
        savings,
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to withdraw from savings goal',
      error: error.message,
    });
  }
};
