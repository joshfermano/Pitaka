import { Request, Response } from 'express';
import { Payment } from '../models/Payment';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

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
    const {
      accountId,
      billerId,
      billerName,
      accountNumber,
      amount,
      fee = 0,
      description,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    if (amount <= 0) {
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

    // Check if account has sufficient balance
    const totalAmount = amount + fee;
    if (account.balance < totalAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // Generate reference number
    const referenceNumber = Payment.generateReferenceNumber();

    // Create payment record with initial status
    const payment = await Payment.create(
      [
        {
          userId,
          accountId,
          billerId,
          billerName,
          accountNumber,
          amount,
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
          type: 'payment',
          amount: totalAmount,
          description: description || `Payment to ${billerName}`,
          paymentId: payment[0]._id,
        },
      ],
      { session }
    );

    // Update payment with transaction ID and mark as completed
    if (transaction[0]?._id) {
      payment[0].transactionId = transaction[0]._id as any;
    }
    payment[0].status = 'COMPLETED';
    await payment[0].save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: payment[0],
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
    const { limit = 10, page = 1, status, accountId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };

    if (
      status &&
      ['pending', 'completed', 'failed', 'cancelled'].includes(status as string)
    ) {
      filter.status = status;
    }

    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid payment ID',
      });
    }

    const payment = await Payment.findOne({ _id: id, userId }).populate(
      'accountId',
      'accountNumber name'
    );

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
