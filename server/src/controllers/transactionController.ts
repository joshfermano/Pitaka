import { Request, Response } from 'express';
import Account from '../models/Account';
import Transaction from '../models/Transaction';
import { Transfer } from '../models/Transfer';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import {
  TransactionType,
  TransactionStatus,
  ITransaction,
} from '../models/Transaction';

interface EnhancedTransaction extends ITransaction {
  formattedDate?: string;
  referenceNumber?: string;
  method?: string;
  relatedAccountNumber?: string;
  [key: string]: any;
}

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
    const { limit = 10, page = 1, accountId, transactionId } = req.query;

    console.log('getTransactions called with userId:', userId);
    console.log('Query params:', { limit, page, accountId, transactionId });

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter based on query params
    const filter: any = { userId };
    if (accountId && mongoose.Types.ObjectId.isValid(accountId as string)) {
      filter.accountId = accountId;
    }

    // Special case for direct transaction lookup
    if (transactionId) {
      filter.transactionId = transactionId;
      console.log('Searching for specific transactionId:', transactionId);
    }

    console.log('Filter:', filter);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('accountId', 'accountNumber name');

    console.log(`Found ${transactions.length} transactions for user ${userId}`);

    if (transactionId && transactions.length > 0) {
      console.log('Found transaction by ID:', transactions[0]._id);
    }

    const total = await Transaction.countDocuments(filter);
    console.log(`Total transactions for this filter: ${total}`);

    res.status(StatusCodes.OK).json({
      success: true,
      count: transactions.length,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: { transactions },
    });
  } catch (error: any) {
    console.error('Error in getTransactions:', error);
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
 * @route GET /api/transactions/by-transaction-id/:transactionId
 * @access Private
 */
export const getTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check which parameter is present - id or transactionId
    const id = req.params.id || req.params.transactionId;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    console.log(`Getting transaction ${id} for user ${userId}`);
    console.log(`Request params:`, req.params);
    console.log(`Request path:`, req.path);

    // Determine if this was called with transactionId param specifically
    const isTransactionIdRoute =
      req.path.includes('by-transaction-id') || !!req.params.transactionId;
    console.log(
      `Using ${
        isTransactionIdRoute ? 'transaction ID' : 'MongoDB ID'
      } lookup route`
    );

    // Get a list of all user's transactions for debugging
    const allTransactionIds = await Transaction.find({ userId })
      .select('_id transactionId type createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`User has ${allTransactionIds.length} recent transactions`);
    if (allTransactionIds.length > 0) {
      console.log('Available transactions:');
      allTransactionIds.forEach((t, i) =>
        console.log(
          `${i + 1}. _id: ${t._id}, transactionId: ${t.transactionId}`
        )
      );
    }

    // Multiple search strategies with better error handling
    let transaction = null;
    let errors = [];

    // First search by transaction ID if it starts with TXN (our standard prefix)
    if (
      id.toString().startsWith('TXN') ||
      id.toString().startsWith('S') ||
      id.toString().startsWith('R')
    ) {
      try {
        console.log(
          `ID starts with TXN/S/R, prioritizing transactionId search`
        );

        // First relaxed search - might be more tolerant
        const txnResults = await Transaction.find({
          transactionId: { $regex: id, $options: 'i' },
        })
          .populate('accountId', 'accountNumber name')
          .sort({ createdAt: -1 })
          .limit(1)
          .exec();

        if (txnResults && txnResults.length > 0) {
          transaction = txnResults[0];
          console.log(
            `Found transaction by TXN/S/R prefix search: ${transaction.transactionId}`
          );
        } else {
          errors.push('Not found by TXN/S/R prefix search');

          // Try other search methods
          transaction = await Transaction.findOne({
            $or: [
              { transactionId: id },
              { transactionId: { $regex: `^${id}$`, $options: 'i' } },
            ],
          }).populate('accountId', 'accountNumber name');

          if (transaction) {
            console.log(
              `Found transaction by exact match: ${transaction.transactionId}`
            );
          } else {
            errors.push('Not found by exact match');
          }
        }
      } catch (err: any) {
        errors.push(`Error searching with TXN/S/R prefix: ${err.message}`);
      }
    }

    // Get a sample of transactions for this user to help debug
    const sampleTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3);

    console.log(`User has ${sampleTransactions.length} recent transactions.`);
    if (sampleTransactions.length > 0) {
      console.log('Sample transactions:');
      sampleTransactions.forEach((t, i) => {
        console.log(
          `${i + 1}. _id: ${t._id}, transactionId: ${t.transactionId}`
        );
      });
    }

    // If transaction still not found, try using the specific transactionId route
    if (!transaction && isTransactionIdRoute) {
      try {
        console.log(`Trying to find by exact transactionId: ${id}`);

        // Check without userId constraint first
        const anyTransaction = await Transaction.findOne({
          transactionId: id,
        });

        if (anyTransaction) {
          // Now check if it belongs to this user
          if (anyTransaction.userId === userId) {
            transaction = anyTransaction;
            await transaction.populate('accountId', 'accountNumber name');
            console.log(
              `Found transaction by transactionId: ${transaction.transactionId}`
            );
          } else {
            errors.push(
              `Transaction found but belongs to another user: ${anyTransaction.userId}`
            );
          }
        } else {
          errors.push('Not found by exact transactionId');
        }
      } catch (err: any) {
        errors.push(`Error finding by transactionId: ${err.message}`);
      }
    }

    // Try MongoDB ObjectID match if not already found
    if (!transaction && mongoose.Types.ObjectId.isValid(id)) {
      try {
        console.log(`Attempting to find transaction by MongoDB _id: ${id}`);
        transaction = await Transaction.findOne({ _id: id, userId }).populate(
          'accountId',
          'accountNumber name'
        );

        if (transaction) {
          console.log(`Found transaction by MongoDB _id: ${transaction._id}`);
        } else {
          errors.push('Not found by MongoDB _id');

          // Try without userId constraint
          const anyTransaction = await Transaction.findOne({ _id: id });
          if (anyTransaction) {
            console.log(
              `Found transaction but belongs to user ${anyTransaction.userId}, not ${userId}`
            );
            errors.push(
              `Transaction belongs to another user: ${anyTransaction.userId}`
            );
          }
        }
      } catch (err: any) {
        errors.push(`Error finding by _id: ${err.message}`);
      }
    }

    // Try case-insensitive and partial matching if still not found
    if (!transaction && !isTransactionIdRoute) {
      try {
        console.log(`Trying case-insensitive transactionId match for: ${id}`);
        transaction = await Transaction.findOne({
          transactionId: { $regex: new RegExp('^' + id + '$', 'i') },
          userId,
        }).populate('accountId', 'accountNumber name');

        if (transaction) {
          console.log(
            `Found transaction by case-insensitive transactionId: ${transaction.transactionId}`
          );
        } else {
          errors.push('Not found by case-insensitive transactionId');
        }
      } catch (err: any) {
        errors.push(`Error in flexible matching: ${err.message}`);
      }
    }

    if (!transaction) {
      console.log(`Transaction not found for ID: ${id} and user: ${userId}`);
      console.log('Search errors:', errors.join(', '));

      // Log some sample transactions to help with debugging
      const recentTransactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('_id transactionId type amount createdAt');

      if (recentTransactions.length > 0) {
        console.log('Recent transactions for this user:');
        recentTransactions.forEach((t, i) => {
          console.log(
            `${i + 1}. ID: ${t._id}, transactionId: ${
              t.transactionId
            }, createdAt: ${t.createdAt}`
          );
        });
      } else {
        console.log('No recent transactions found for this user.');
      }

      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Transaction not found. Tried ${errors.length} search methods.`,
        details: {
          errors,
          userId,
          searchParams: {
            id,
            isTransactionIdRoute,
            isObjectId: mongoose.Types.ObjectId.isValid(id),
          },
          recentTransactions: recentTransactions.map((t) => ({
            _id: t._id,
            transactionId: t.transactionId,
            createdAt: t.createdAt,
          })),
        },
      });
    }

    console.log(
      `Transaction found: ${transaction._id}, transactionId: ${transaction.transactionId}, type: ${transaction.type}`
    );

    // Handle the case when the transaction has a transferId
    if (transaction.transferId) {
      console.log(
        `Transaction has transferId: ${transaction.transferId}, attempting to populate`
      );

      try {
        // Populate the transferId with Transfer details
        await transaction.populate({
          path: 'transferId',
          select:
            'senderId senderAccountId recipientAccountNumber recipientAccountId amount fee type description reference status createdAt',
        });

        console.log(
          `Successfully populated transferId: ${JSON.stringify(
            transaction.transferId || {}
          )}`
        );
      } catch (err) {
        console.error(`Error populating transferId: ${err}`);
      }
    }

    // Enhance response with additional details based on transaction type
    const enhancedTransaction: EnhancedTransaction = transaction.toObject();

    // Add formatted date string for convenience
    enhancedTransaction.formattedDate = transaction.date
      ? new Date(transaction.date).toLocaleString()
      : new Date(transaction.createdAt).toLocaleString();

    // Add specific details based on transaction type
    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        // Extract reference number from description if present
        const refMatch = transaction.description.match(/Ref: ([A-Z0-9]+)/i);
        if (refMatch && refMatch[1]) {
          enhancedTransaction.referenceNumber = refMatch[1];
        }
        break;

      case TransactionType.WITHDRAWAL:
        // Extract withdrawal method if present
        const methodMatch = transaction.description.match(/^([A-Za-z\s]+)/);
        if (methodMatch && methodMatch[1]) {
          enhancedTransaction.method = methodMatch[1].trim();
        }
        break;

      case TransactionType.TRANSFER:
      case TransactionType.TRANSFER_RECEIVED:
        // Handle transfer-specific details
        if (transaction.transferId) {
          enhancedTransaction.transfer = transaction.transferId;

          // Add the related account number
          if (transaction.type === TransactionType.TRANSFER) {
            // For outgoing transfers, the recipient account is the related one
            enhancedTransaction.relatedAccountNumber =
              enhancedTransaction.transfer.recipientAccountNumber;
          } else {
            // For incoming transfers, try to get the sender's account details
            try {
              const senderAccount = await Account.findById(
                enhancedTransaction.transfer.senderAccountId
              );
              if (senderAccount) {
                enhancedTransaction.relatedAccountNumber =
                  senderAccount.accountNumber;
              }
            } catch (err) {
              console.error(`Error getting sender account: ${err}`);
            }
          }
        } else {
          // Fallback to parsing from description if transferId not available
          const accountMatch = transaction.description.match(
            /(?:to|from) ([A-Za-z\s]+)|account ending in (\d+)/i
          );
          if (accountMatch) {
            enhancedTransaction.relatedAccountNumber =
              accountMatch[1] || accountMatch[2];
          }
        }
        break;

      default:
        // No special handling for other transaction types
        break;
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        transaction: enhancedTransaction,
      },
    });
  } catch (error: any) {
    console.error('Error in getTransaction controller:', error);
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

    console.log('getRecentTransactions called with userId:', userId);
    console.log('Query params:', { limit });

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

    console.log(
      `Found ${transactions.length} recent transactions for user ${userId}`
    );
    if (transactions.length > 0) {
      console.log('First transaction:', {
        id: transactions[0]._id,
        type: transactions[0].type,
        amount: transactions[0].amount,
        description: transactions[0].description,
        date: transactions[0].date,
      });
    }

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
