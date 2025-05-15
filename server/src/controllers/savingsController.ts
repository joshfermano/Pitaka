import { Request, Response } from 'express';
import Savings, { SavingsTransactionType } from '../models/Savings';
import Account from '../models/Account';
import Transaction, {
  TransactionType,
  TransactionStatus,
} from '../models/Transaction';
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

    console.log('createSavings request body:', JSON.stringify(req.body));
    console.log('User ID from token:', userId);

    if (!userId) {
      console.error('Missing user ID in auth token');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User ID not found in auth token',
      });
    }

    // Extract and validate required fields
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

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!targetAmount) missingFields.push('targetAmount');
    if (!endDate) missingFields.push('endDate');
    if (!accountId) missingFields.push('accountId');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Validate data types and ranges
    if (typeof name !== 'string' || name.trim().length === 0) {
      console.error('Invalid name:', name);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Name must be a non-empty string',
      });
    }

    if (typeof targetAmount !== 'number' || isNaN(targetAmount)) {
      console.error('Invalid targetAmount:', targetAmount);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Target amount must be a valid number',
      });
    }

    console.log(
      'Creating savings with data:',
      JSON.stringify({
        userId,
        name,
        targetAmount,
        endDate,
        accountId,
        initialDeposit,
        autoTransfer,
        icon,
      })
    );

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      console.log('Invalid account ID:', accountId);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (targetAmount <= 0) {
      console.log('Invalid target amount:', targetAmount);
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
      console.log('Account not found:', accountId, 'for user:', userId);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Check if account has sufficient balance for initial deposit
    if (initialDeposit > 0 && account.balance < initialDeposit) {
      console.log(
        'Insufficient balance for initial deposit:',
        account.balance,
        'needed:',
        initialDeposit
      );
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance for initial deposit',
      });
    }

    // Ensure autoTransfer frequency is valid
    if (autoTransfer && autoTransfer.enabled) {
      const validFrequencies = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'NONE'];
      if (!validFrequencies.includes(autoTransfer.frequency)) {
        console.log('Invalid frequency:', autoTransfer.frequency);
        autoTransfer.frequency = 'NONE';
      }
    }

    try {
      // Parse end date
      let parsedEndDate: Date;
      try {
        parsedEndDate = endDate instanceof Date ? endDate : new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (dateError) {
        console.error(
          'Error parsing end date:',
          dateError,
          'Input was:',
          endDate
        );
        parsedEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year
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
            endDate: parsedEndDate,
            autoTransfer,
            notes,
            isActive: true,
          },
        ],
        { session }
      );

      console.log('Savings created successfully:', savings[0]._id);

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
              transactionId: Transaction.generateTransactionId(),
              type: TransactionType.DEPOSIT,
              amount: initialDeposit,
              description: `Initial deposit for savings: ${name}`,
              savingsId: savings[0]._id,
              status: TransactionStatus.COMPLETED,
              date: new Date(),
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
    } catch (createError: any) {
      console.error('Error creating savings document:', createError);
      console.error('Stack trace:', createError.stack);
      throw createError;
    }
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    console.error('Error in createSavings controller:', error);
    console.error('Stack trace:', error.stack);
    console.error('Request body was:', req.body);

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
          transactionId: Transaction.generateTransactionId(),
          type: TransactionType.DEPOSIT,
          amount,
          description: `Deposit to savings: ${savings.name}`,
          savingsId: savings._id,
          status: TransactionStatus.COMPLETED,
          date: new Date(),
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
          transactionId: Transaction.generateTransactionId(),
          type: TransactionType.WITHDRAWAL,
          amount,
          description: `Withdrawal from savings: ${savings.name}`,
          savingsId: id,
          status: TransactionStatus.COMPLETED,
          date: new Date(),
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

/**
 * Update a savings account
 * @route PATCH /api/savings/:id
 * @access Private
 */
export const updateSavingsAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, icon, targetAmount, endDate, autoTransfer, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid savings ID',
      });
    }

    // Find the savings account
    const savings = await Savings.findOne({
      _id: id,
      userId,
    });

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Savings account not found',
      });
    }

    // Update fields if provided
    if (name) savings.name = name;
    if (icon) savings.icon = icon;
    if (notes !== undefined) savings.notes = notes;

    // Update target amount if provided
    if (targetAmount && targetAmount > 0) {
      savings.targetAmount = targetAmount;
      savings.progress = savings.currentAmount / targetAmount;
    }

    // Update end date if provided
    if (endDate) {
      savings.endDate = new Date(endDate);
    }

    // Update auto transfer settings if provided
    if (autoTransfer) {
      savings.autoTransfer = {
        enabled: autoTransfer.enabled,
        amount: autoTransfer.amount || 0,
        frequency: autoTransfer.frequency || 'none',
        nextDate: autoTransfer.enabled
          ? (() => {
              const nextDate = new Date();
              if (autoTransfer.frequency === 'weekly') {
                nextDate.setDate(nextDate.getDate() + 7);
              } else if (autoTransfer.frequency === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
              } else if (autoTransfer.frequency === 'quarterly') {
                nextDate.setMonth(nextDate.getMonth() + 3);
              }
              return nextDate;
            })()
          : null,
      };
    }

    await savings.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Savings account updated successfully',
      data: { savings },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update savings account',
      error: error.message,
    });
  }
};

/**
 * Delete a savings account
 * @route DELETE /api/savings/:id
 * @access Private
 */
export const deleteSavingsAccount = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid savings ID',
      });
    }

    // Find the savings account
    const savings = await Savings.findOne({
      _id: id,
      userId,
    }).session(session);

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Savings account not found',
      });
    }

    // If there's any balance in the savings account, transfer it back to the main account
    if (savings.currentAmount > 0) {
      const account = await Account.findById(savings.accountId).session(
        session
      );

      if (account) {
        account.balance += savings.currentAmount;
        await account.save({ session });

        // Create transaction record for withdrawal
        await Transaction.create(
          [
            {
              userId,
              accountId: savings.accountId,
              transactionId: Transaction.generateTransactionId(),
              type: TransactionType.WITHDRAWAL,
              amount: savings.currentAmount,
              description: `Withdrawal due to savings account deletion: ${savings.name}`,
              savingsId: id,
              status: TransactionStatus.COMPLETED,
              date: new Date(),
            },
          ],
          { session }
        );
      }
    }

    // Delete the savings account
    await Savings.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Savings account deleted successfully',
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete savings account',
      error: error.message,
    });
  }
};

/**
 * Get transactions for a savings account
 * @route GET /api/savings/:id/transactions
 * @access Private
 */
export const getTransactionsForSavings = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { limit = 20, page = 1 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid savings ID',
      });
    }

    // Check if savings account exists and belongs to user
    const savings = await Savings.findOne({
      _id: id,
      userId,
    });

    if (!savings) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Savings account not found',
      });
    }

    // Extract transactions and paginate
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    // Sort transactions by date (most recent first)
    const sortedTransactions = [...savings.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const paginatedTransactions = sortedTransactions.slice(
      startIndex,
      endIndex
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: savings.transactions.length,
      totalPages: Math.ceil(savings.transactions.length / limitNum),
      currentPage: pageNum,
      data: { transactions: paginatedTransactions },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch savings transactions',
      error: error.message,
    });
  }
};
