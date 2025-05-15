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
exports.transferToAnotherBank = exports.transferToAnotherUser = exports.transferBetweenOwnAccounts = exports.removeTransferRecipient = exports.toggleFavoriteRecipient = exports.addTransferRecipient = exports.getTransferRecipients = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const http_status_codes_1 = require("http-status-codes");
const Transfer_1 = require("../models/Transfer");
const Account_1 = __importDefault(require("../models/Account"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importStar(require("../models/Transaction"));
// No need to declare AuthRequest interface as it's already defined in Express namespace
// Interface extension is handled in authMiddleware.ts
// Use Request directly
/**
 * Get all transfer recipients for a user
 * @route GET /api/transfers/recipients
 * @access Private
 */
const getTransferRecipients = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const recipients = await Transfer_1.TransferRecipient.find({ userId });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: recipients.length,
            data: { recipients },
        });
    }
    catch (error) {
        console.error('Error fetching transfer recipients:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch transfer recipients',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getTransferRecipients = getTransferRecipients;
/**
 * Add a transfer recipient
 * @route POST /api/transfers/recipients
 * @access Private
 */
const addTransferRecipient = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, accountNumber, bankName, bankCode } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!name || !accountNumber) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Name and account number are required',
            });
        }
        // For interbank transfers, bankName and bankCode are required
        const isInterbank = !!bankName || !!bankCode;
        if (isInterbank && (!bankName || !bankCode)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Bank name and bank code are required for interbank transfers',
            });
        }
        // Check if recipient already exists
        const existingRecipient = await Transfer_1.TransferRecipient.findOne({
            userId,
            accountNumber,
            ...(isInterbank ? { bankCode } : {}),
        });
        if (existingRecipient) {
            return res.status(http_status_codes_1.StatusCodes.CONFLICT).json({
                success: false,
                message: 'Recipient already exists',
            });
        }
        // Create new recipient
        const recipient = await Transfer_1.TransferRecipient.create({
            userId,
            name,
            accountNumber,
            ...(isInterbank ? { bankName, bankCode } : {}),
            isFavorite: false,
        });
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'Recipient added successfully',
            data: { recipient },
        });
    }
    catch (error) {
        console.error('Error adding transfer recipient:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to add transfer recipient',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.addTransferRecipient = addTransferRecipient;
/**
 * Toggle favorite status of a recipient
 * @route PATCH /api/transfers/recipients/:id/favorite
 * @access Private
 */
const toggleFavoriteRecipient = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid recipient ID',
            });
        }
        const recipient = await Transfer_1.TransferRecipient.findOne({
            _id: id,
            userId,
        });
        if (!recipient) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Recipient not found',
            });
        }
        // Toggle favorite status
        recipient.isFavorite = !recipient.isFavorite;
        await recipient.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: `Recipient ${recipient.isFavorite ? 'added to' : 'removed from'} favorites`,
            data: { recipient },
        });
    }
    catch (error) {
        console.error('Error toggling favorite recipient:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update recipient',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.toggleFavoriteRecipient = toggleFavoriteRecipient;
/**
 * Remove a transfer recipient
 * @route DELETE /api/transfers/recipients/:id
 * @access Private
 */
const removeTransferRecipient = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid recipient ID',
            });
        }
        const result = await Transfer_1.TransferRecipient.findOneAndDelete({
            _id: id,
            userId,
        });
        if (!result) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Recipient not found',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Recipient removed successfully',
        });
    }
    catch (error) {
        console.error('Error removing transfer recipient:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to remove recipient',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.removeTransferRecipient = removeTransferRecipient;
/**
 * Transfer between own accounts (internal transfer)
 * @route POST /api/transfers/internal
 * @access Private
 */
const transferBetweenOwnAccounts = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { fromAccountId, toAccountId, amount, description } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'From account, to account, and amount are required',
            });
        }
        if (fromAccountId === toAccountId) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Cannot transfer to the same account',
            });
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }
        // Check if both accounts exist and belong to user
        const fromAccount = await Account_1.default.findOne({
            _id: fromAccountId,
            userId,
        }).session(session);
        const toAccount = await Account_1.default.findOne({
            _id: toAccountId,
            userId,
        }).session(session);
        if (!fromAccount || !toAccount) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'One or both accounts not found',
            });
        }
        // Check if from account has sufficient balance
        if (fromAccount.balance < amountNum) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Update account balances
        fromAccount.balance -= amountNum;
        toAccount.balance += amountNum;
        await fromAccount.save({ session });
        await toAccount.save({ session });
        // Generate reference number
        const reference = `TRF${Date.now()}${Math.floor(Math.random() * 1000)}`;
        // Generate a transaction ID for the related transactions
        const transactionId = Transaction_1.default.generateTransactionId();
        // Create transfer record
        const transfer = await Transfer_1.Transfer.create([
            {
                userId,
                senderId: userId,
                senderAccountId: fromAccountId,
                recipientId: userId, // For internal transfers, sender is also recipient
                recipientAccountId: toAccountId,
                recipientAccountNumber: toAccount.accountNumber,
                amount: amountNum,
                fee: 0, // No fee for internal transfers
                type: Transfer_1.TransferType.INTERNAL,
                description: description ||
                    `Transfer to ${toAccount.name || toAccount.accountNumber}`,
                status: 'COMPLETED',
                reference,
            },
        ], { session, ordered: true });
        // Create transaction records
        await Transaction_1.default.create([
            {
                transactionId: `S${transactionId}`, // Add unique transaction ID for sender
                userId,
                accountId: fromAccountId,
                type: Transaction_1.TransactionType.TRANSFER,
                amount: -amountNum, // Negative for outgoing
                description: description ||
                    `Transfer to ${toAccount.name || toAccount.accountNumber}`,
                transferId: transfer[0]._id,
                status: 'COMPLETED',
            },
            {
                transactionId: `R${transactionId}`, // Add unique transaction ID for recipient
                userId,
                accountId: toAccountId,
                type: Transaction_1.TransactionType.TRANSFER_RECEIVED,
                amount: amountNum, // Positive for incoming
                description: description ||
                    `Received from ${fromAccount.name || fromAccount.accountNumber}`,
                transferId: transfer[0]._id,
                status: 'COMPLETED',
            },
        ], { session, ordered: true });
        await session.commitTransaction();
        session.endSession();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Transfer completed successfully',
            data: {
                transfer: transfer[0],
                fromAccountBalance: fromAccount.balance,
                toAccountBalance: toAccount.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error performing internal transfer:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process transfer',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.transferBetweenOwnAccounts = transferBetweenOwnAccounts;
/**
 * Transfer to another Pitaka user
 * @route POST /api/transfers/external
 * @access Private
 */
const transferToAnotherUser = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // Get user ID from authenticated user
        const senderId = req.user?.id;
        // Enhanced debugging information
        console.log('Transfer to another user request:', {
            path: req.path,
            method: req.method,
            user: req.user,
            body: req.body,
            headers: req.headers['content-type'],
            senderId,
        });
        const { fromAccountId, recipientAccountNumber, amount, description } = req.body;
        if (!senderId) {
            console.error('Transfer failed: User not authenticated');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!fromAccountId || !recipientAccountNumber || !amount) {
            console.error('Transfer failed: Missing required fields', {
                fromAccountId,
                recipientAccountNumber,
                amount,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Source account, recipient account number, and amount are required',
            });
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.error('Transfer failed: Invalid amount', { amount });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }
        console.log('Finding sender account:', { fromAccountId, userId: senderId });
        // Check if sender account exists
        const senderAccount = await Account_1.default.findOne({
            _id: fromAccountId,
            userId: senderId,
        }).session(session);
        if (!senderAccount) {
            console.error('Transfer failed: Sender account not found', {
                fromAccountId,
                userId: senderId,
            });
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Sender account not found',
            });
        }
        // Check if sender has sufficient balance
        if (senderAccount.balance < amountNum) {
            console.error('Transfer failed: Insufficient balance', {
                balance: senderAccount.balance,
                amount: amountNum,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance',
            });
        }
        // Normalize the account number by removing spaces and other non-alphanumeric characters
        const normalizedAccountNumber = recipientAccountNumber.replace(/\D/g, '');
        console.log('Finding recipient account:', {
            recipientAccountNumber,
            normalizedAccountNumber,
        });
        // Find recipient account by account number with flexible matching
        const recipientAccount = await Account_1.default.findOne({
            $or: [
                { accountNumber: recipientAccountNumber },
                { accountNumber: normalizedAccountNumber },
                // Also try with the account number as a regex to match regardless of formatting
                {
                    accountNumber: {
                        $regex: normalizedAccountNumber.replace(/(\d{4})/g, '$1[^a-zA-Z0-9]*'),
                    },
                },
            ],
        }).session(session);
        if (!recipientAccount) {
            console.error('Transfer failed: Recipient account not found', {
                recipientAccountNumber,
                normalizedAccountNumber,
            });
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Recipient account not found',
            });
        }
        // Make sure sender isn't sending to their own account
        if (recipientAccount.userId.toString() === senderId) {
            console.error('Transfer failed: Cannot transfer to own account');
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Cannot transfer to your own account. Use internal transfer instead.',
            });
        }
        // Update account balances
        senderAccount.balance -= amountNum;
        recipientAccount.balance += amountNum;
        await senderAccount.save({ session });
        await recipientAccount.save({ session });
        // Get recipient user details for reference
        const recipientUser = await User_1.default.findById(recipientAccount.userId)
            .select('firstName lastName')
            .session(session);
        const recipientName = recipientUser
            ? `${recipientUser.firstName} ${recipientUser.lastName}`
            : recipientAccount.accountNumber;
        // Generate reference number
        const reference = `EXT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        // First, create or find the transfer recipient
        let recipient;
        const existingRecipient = await Transfer_1.TransferRecipient.findOne({
            userId: senderId,
            accountNumber: recipientAccount.accountNumber, // Use the recipient's actual account number from the database
        }).session(session);
        if (existingRecipient) {
            recipient = existingRecipient;
        }
        else {
            const newRecipient = await Transfer_1.TransferRecipient.create([
                {
                    userId: senderId,
                    name: recipientName,
                    accountNumber: recipientAccount.accountNumber, // Use the recipient's actual account number from the database
                    isFavorite: false,
                },
            ], { session });
            recipient = newRecipient[0];
        }
        console.log('Creating transfer record with:', {
            senderId,
            senderAccountId: fromAccountId,
            recipientId: recipient._id,
        });
        // Generate a transaction ID for the related transactions
        const transactionId = Transaction_1.default.generateTransactionId();
        // Create transfer record with the required fields
        const transfer = await Transfer_1.Transfer.create([
            {
                userId: senderId, // Required field
                senderId: senderId,
                senderAccountId: fromAccountId,
                recipientId: recipient._id,
                recipientAccountNumber: recipientAccount.accountNumber,
                recipientAccountId: recipientAccount._id,
                recipientUserId: recipientAccount.userId,
                amount: amountNum,
                fee: 0,
                type: Transfer_1.TransferType.EXTERNAL,
                description: description || `Transfer to ${recipientName}`,
                status: 'COMPLETED',
                reference,
            },
        ], { session, ordered: true } // Add ordered: true option
        );
        // Create transaction records for both sender and receiver
        await Transaction_1.default.create([
            {
                transactionId: `S${transactionId}`, // Add unique transaction ID for sender
                userId: senderId,
                accountId: fromAccountId,
                type: Transaction_1.TransactionType.TRANSFER,
                amount: -amountNum, // Negative for outgoing
                description: description || `Transfer to ${recipientName}`,
                transferId: transfer[0]._id,
                status: 'COMPLETED',
            },
            {
                transactionId: `R${transactionId}`, // Add unique transaction ID for recipient
                userId: recipientAccount.userId,
                accountId: recipientAccount._id,
                type: Transaction_1.TransactionType.TRANSFER_RECEIVED,
                amount: amountNum, // Positive for incoming
                description: description
                    ? `Received: ${description}`
                    : `Received from ${senderAccount.accountNumber}`,
                transferId: transfer[0]._id,
                status: 'COMPLETED',
            },
        ], { session, ordered: true } // Add ordered: true option
        );
        await session.commitTransaction();
        session.endSession();
        console.log('Transfer completed successfully', {
            transferId: transfer[0]._id,
            amount: amountNum,
            sender: senderId,
            recipient: recipientAccount.userId,
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Transfer completed successfully',
            data: {
                transfer: transfer[0],
                fromAccountBalance: senderAccount.balance,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error performing external transfer:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process transfer',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.transferToAnotherUser = transferToAnotherUser;
/**
 * Transfer to another bank (interbank transfer)
 * @route POST /api/transfers/interbank
 * @access Private
 */
const transferToAnotherBank = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const userId = req.user?.id;
        const { fromAccountId, recipientName, recipientAccountNumber, bankName, bankCode, amount, description, } = req.body;
        // Enhanced debugging information
        console.log('Interbank transfer request:', {
            path: req.path,
            method: req.method,
            user: req.user,
            body: req.body,
            userId,
        });
        if (!userId) {
            console.error('Transfer failed: User not authenticated');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!fromAccountId ||
            !recipientName ||
            !recipientAccountNumber ||
            !bankName ||
            !bankCode ||
            !amount) {
            console.error('Transfer failed: Missing required fields', {
                fromAccountId,
                recipientName,
                recipientAccountNumber,
                bankName,
                bankCode,
                amount,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Source account, recipient details, bank details, and amount are required',
            });
        }
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            console.error('Transfer failed: Invalid amount', { amount });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }
        // Check if account exists and belongs to user
        console.log('Finding sender account:', { fromAccountId, userId });
        const fromAccount = await Account_1.default.findOne({
            _id: fromAccountId,
            userId,
        }).session(session);
        if (!fromAccount) {
            console.error('Transfer failed: Account not found', {
                fromAccountId,
                userId,
            });
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Account not found',
            });
        }
        // Calculate transfer fee (25 PHP for interbank transfers)
        const fee = 25;
        const totalAmount = amountNum + fee;
        // Check if user has sufficient balance
        if (fromAccount.balance < totalAmount) {
            console.error('Transfer failed: Insufficient balance', {
                balance: fromAccount.balance,
                amount: totalAmount,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient balance including fee',
            });
        }
        // Update account balance
        fromAccount.balance -= totalAmount;
        await fromAccount.save({ session });
        // Generate reference number
        const reference = `INT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        // First, create a transfer recipient record if it doesn't exist
        console.log('Finding or creating recipient:', {
            userId,
            recipientName,
            recipientAccountNumber,
            bankCode,
        });
        let recipient;
        const existingRecipient = await Transfer_1.TransferRecipient.findOne({
            userId,
            accountNumber: recipientAccountNumber,
            bankCode,
        }).session(session);
        if (existingRecipient) {
            recipient = existingRecipient;
        }
        else {
            const newRecipient = await Transfer_1.TransferRecipient.create([
                {
                    userId,
                    name: recipientName,
                    accountNumber: recipientAccountNumber,
                    bankName,
                    bankCode,
                    isFavorite: false,
                },
            ], { session });
            recipient = newRecipient[0];
        }
        console.log('Creating interbank transfer record:', {
            userId,
            fromAccountId,
            recipientId: recipient._id,
        });
        // Generate a transaction ID for the transaction
        const transactionId = Transaction_1.default.generateTransactionId();
        // Create transfer record
        const transfer = await Transfer_1.Transfer.create([
            {
                userId, // Required field
                senderId: userId,
                senderAccountId: fromAccountId,
                recipientId: recipient._id,
                recipientAccountNumber,
                recipientUserId: null, // Set to null for interbank transfers
                recipientAccountId: null, // Set to null for interbank transfers
                bankName,
                bankCode,
                amount: amountNum,
                fee,
                type: Transfer_1.TransferType.INTERBANK,
                description: description || `Transfer to ${recipientName} at ${bankName}`,
                status: 'COMPLETED', // In a real system, this might be PENDING until confirmed
                reference,
            },
        ], { session, ordered: true });
        // Create transaction record
        await Transaction_1.default.create([
            {
                transactionId: transactionId, // Add the generated transaction ID
                userId,
                accountId: fromAccountId,
                type: Transaction_1.TransactionType.TRANSFER,
                amount: -totalAmount, // Use negative amount for outgoing transfer
                description: description || `Transfer to ${recipientName} at ${bankName}`,
                transferId: transfer[0]._id,
                status: 'COMPLETED',
            },
        ], { session, ordered: true });
        await session.commitTransaction();
        session.endSession();
        console.log('Interbank transfer completed successfully', {
            transferId: transfer[0]._id,
            amount: amountNum,
            fee,
            sender: userId,
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Transfer initiated successfully',
            data: {
                transfer: transfer[0],
                fromAccountBalance: fromAccount.balance,
                fee,
            },
        });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error performing interbank transfer:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process transfer',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.transferToAnotherBank = transferToAnotherBank;
