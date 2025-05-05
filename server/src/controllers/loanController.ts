import { Request, Response } from 'express';
import { Loan } from '../models/Loan';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Apply for a new loan
 * @route POST /api/loans
 * @access Private
 */
export const applyForLoan = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const {
      amount,
      term,
      purpose,
      accountId,
      interestRate = 0.05, // Default interest rate 5%
      loanProductId,
      title,
      disbursementDate = new Date(),
      nextPayment = amount * 0.1, // Default 10% of loan amount
      dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      paymentFrequency = 'MONTHLY',
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(loanProductId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid loan product ID',
      });
    }

    // Validate loan amount
    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Loan amount must be greater than zero',
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

    // Create loan application
    const loan = await Loan.create(
      [
        {
          userId,
          loanProductId,
          title,
          amount,
          paid: 0,
          remaining: amount,
          nextPayment,
          dueDate,
          disbursementDate,
          term,
          interest: `${interestRate * 100}%`,
          status: 'PENDING',
          paymentFrequency,
          accountNumber: account.accountNumber,
          payments: [],
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Loan application submitted successfully',
      data: {
        loan: loan[0],
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process loan application',
      error: error.message,
    });
  }
};

/**
 * Get all loans for a user
 * @route GET /api/loans
 * @access Private
 */
export const getLoans = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, page = 1, status, accountId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };

    if (
      status &&
      ['pending', 'approved', 'rejected', 'active', 'closed'].includes(
        status as string
      )
    ) {
      filter.status = status;
    }

    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    const loans = await Loan.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

    const total = await Loan.countDocuments(filter);

    res.status(StatusCodes.OK).json({
      success: true,
      count: loans.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: { loans },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch loans',
      error: error.message,
    });
  }
};

/**
 * Get a single loan by ID
 * @route GET /api/loans/:id
 * @access Private
 */
export const getLoan = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid loan ID',
      });
    }

    const loan = await Loan.findOne({ _id: id, userId }).populate(
      'accountId',
      'accountNumber name'
    );

    if (!loan) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Calculate progress
    const progress = loan.calculateProgress();

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        loan,
        progress,
      },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch loan',
      error: error.message,
    });
  }
};

/**
 * Make a loan payment
 * @route POST /api/loans/:id/payment
 * @access Private
 */
export const makeLoanPayment = async (req: Request, res: Response) => {
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

    // Validate payment amount
    if (amount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Payment amount must be greater than zero',
      });
    }

    // Find loan
    const loan = await Loan.findOne({
      _id: id,
      userId,
      status: { $in: ['APPROVED', 'ACTIVE'] },
    }).session(session);

    if (!loan) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Active loan not found',
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

    // Deduct amount from account
    account.balance -= amount;
    await account.save({ session });

    // Apply payment to loan
    loan.applyPayment(amount);
    await loan.save({ session });

    // Create transaction record
    await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'loan-payment',
          amount,
          description: `Loan payment - Reference: ${
            loan._id ? loan._id.toString().substring(0, 8) : 'Unknown'
          }`,
          loanId: loan._id,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Loan payment processed successfully',
      data: {
        loan,
        newBalance: account.balance,
        remainingLoanAmount: loan.remaining,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process loan payment',
      error: error.message,
    });
  }
};

/**
 * Get loan payment history
 * @route GET /api/loans/:id/payments
 * @access Private
 */
export const getLoanPayments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid loan ID',
      });
    }

    const loan = await Loan.findOne({ _id: id, userId });
    if (!loan) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Get related transactions
    const payments = await Transaction.find({
      loanId: id,
      type: 'loan-payment',
    }).sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: payments.length,
      data: { payments },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch loan payments',
      error: error.message,
    });
  }
};
