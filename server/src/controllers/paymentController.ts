import { Request, Response } from 'express';
import { Payment, Biller } from '../models/Payment';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

/**
 * Get all billers
 * @route GET /api/payments/billers
 * @access Public
 */
export const getAllBillers = async (req: Request, res: Response) => {
  try {
    const billers = await Biller.find({ isActive: true }).sort({ name: 1 });

    if (billers.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        count: 0,
        data: { billers: [] },
        message: 'No billers found. Please seed the database first.',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      count: billers.length,
      data: { billers },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch billers',
      error: error.message,
    });
  }
};

/**
 * Get billers by category
 * @route GET /api/payments/billers/category/:category
 * @access Public
 */
export const getBillersByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    // Validate category
    const validCategories = [
      'ELECTRICITY',
      'WATER',
      'INTERNET',
      'ENTERTAINMENT',
      'INSURANCE',
      'TELECOM',
      'OTHERS',
    ];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid category',
      });
    }

    const billers = await Biller.find({
      category: category.toUpperCase(),
      isActive: true,
    }).sort({ name: 1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: billers.length,
      data: { billers },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch billers by category',
      error: error.message,
    });
  }
};

/**
 * Get popular billers
 * @route GET /api/payments/billers/popular
 * @access Public
 */
export const getPopularBillers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '5', 10);

    const billers = await Biller.find({
      isActive: true,
      popularIndex: { $exists: true },
    })
      .sort({ popularIndex: 1 })
      .limit(limit);

    res.status(StatusCodes.OK).json({
      success: true,
      count: billers.length,
      data: { billers },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch popular billers',
      error: error.message,
    });
  }
};

/**
 * Get biller by ID
 * @route GET /api/payments/billers/:id
 * @access Public
 */
export const getBillerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid biller ID',
      });
    }

    const biller = await Biller.findOne({ _id: id, isActive: true });

    if (!biller) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Biller not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { biller },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch biller',
      error: error.message,
    });
  }
};

/**
 * Create a new payment
 * @route POST /api/payments
 * @access Private
 */
export const createPayment = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.id;
    const { accountId, billerId, accountNumber, amount, description } =
      req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(billerId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid biller ID',
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Payment amount must be greater than zero',
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

    // Fetch biller details
    const biller = await Biller.findById(billerId);
    if (!biller) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Biller not found',
      });
    }

    // Validate payment amount against biller constraints
    if (amountNum < biller.minimumAmount || amountNum > biller.maximumAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Payment amount must be between ${biller.minimumAmount} and ${biller.maximumAmount}`,
      });
    }

    // Calculate convenience fee if applicable
    const fee = biller.convenienceFee || 0;
    const totalAmount = amountNum + fee;

    // Check if account has sufficient balance
    if (account.balance < totalAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // Generate reference number
    const referenceNumber = Payment.generateReferenceNumber();

    // Create payment record with initial status
    const paymentRecord = await Payment.create(
      [
        {
          userId,
          accountId,
          billerId,
          billerName: biller.name,
          accountNumber,
          amount: amountNum,
          fee,
          status: 'PENDING',
          referenceNumber,
        },
      ],
      { session }
    );

    // Update account balance
    account.balance -= totalAmount;
    await account.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId,
          accountId,
          type: 'PAYMENT',
          amount: totalAmount,
          description: description || `Payment to ${biller.name}`,
          paymentId: paymentRecord[0]._id,
        },
      ],
      { session }
    );

    // Update payment with transaction ID and mark as completed
    if (transaction[0]?._id) {
      paymentRecord[0].transactionId = transaction[0]
        ._id as mongoose.Types.ObjectId;
    }
    paymentRecord[0].status = 'COMPLETED';
    await paymentRecord[0].save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: paymentRecord[0],
        newBalance: account.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message,
    });
  }
};

/**
 * Get all payments for a user
 * @route GET /api/payments
 * @access Private
 */
export const getPayments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const { limit = 10, page = 1, status, accountId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };

    if (
      status &&
      ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(
        (status as string).toUpperCase()
      )
    ) {
      filter.status = (status as string).toUpperCase();
    }

    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name')
      .populate('billerId', 'name logo category');

    if (payments.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        count: 0,
        totalPages: 0,
        currentPage: pageNum,
        data: { payments: [] },
      });
    }

    const total = await Payment.countDocuments(filter);

    res.status(StatusCodes.OK).json({
      success: true,
      count: payments.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: { payments },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
};

/**
 * Get a single payment by ID
 * @route GET /api/payments/:id
 * @access Private
 */
export const getPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment ID',
      });
    }

    const payment = await Payment.findOne({ _id: id, userId })
      .populate('accountId', 'accountNumber name')
      .populate('billerId', 'name logo category accountNumberLabel');

    if (!payment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { payment },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message,
    });
  }
};

/**
 * Cancel a scheduled payment
 * @route PATCH /api/payments/:id/cancel
 * @access Private
 */
export const cancelPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment ID',
      });
    }

    const payment = await Payment.findOne({
      _id: id,
      userId,
      status: 'PENDING',
    });

    if (!payment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Pending payment not found',
      });
    }

    // Cancel the payment
    payment.status = 'FAILED';
    await payment.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: { payment },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to cancel payment',
      error: error.message,
    });
  }
};
