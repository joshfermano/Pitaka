import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
  TRANSFER_RECEIVED = 'TRANSFER_RECEIVED',
  INVESTMENT = 'INVESTMENT',
  PAYMENT = 'PAYMENT',
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ITransaction extends Document {
  transactionId: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  fee: number;
  fromAccount?: mongoose.Types.ObjectId;
  toAccount?: mongoose.Types.ObjectId;
  transferId?: mongoose.Types.ObjectId;
  description: string;
  status: TransactionStatus;
  merchantName?: string;
  merchantLogo?: string;
  merchantCategory?: string;
  date: Date;
  currency: string;
  loanId?: mongoose.Types.ObjectId;
  savingsId?: mongoose.Types.ObjectId;
  loanDetails?: {
    loanType: string;
    principalAmount?: number;
    interestRate?: string;
    term?: string;
    paymentNumber?: number;
    totalPayments?: number;
    remainingBalance?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionModel extends Model<ITransaction> {
  generateTransactionId(): string;
}

const TransactionSchema = new Schema<ITransaction, TransactionModel>(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
    },
    accountId: {
      type: String,
      required: [true, 'Account ID is required'],
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      validate: {
        validator: function (v: number) {
          return v !== 0;
        },
        message: 'Amount cannot be zero',
      },
    },
    fee: {
      type: Number,
      default: 0,
    },
    fromAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    toAccount: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    transferId: {
      type: Schema.Types.ObjectId,
      ref: 'Transfer',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    merchantName: {
      type: String,
      trim: true,
    },
    merchantLogo: {
      type: String,
      trim: true,
    },
    merchantCategory: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      default: '₱',
      trim: true,
    },
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
    },
    savingsId: {
      type: Schema.Types.ObjectId,
      ref: 'Savings',
    },
    loanDetails: {
      loanType: {
        type: String,
        trim: true,
      },
      principalAmount: {
        type: Number,
      },
      interestRate: {
        type: String,
        trim: true,
      },
      term: {
        type: String,
        trim: true,
      },
      paymentNumber: {
        type: Number,
      },
      totalPayments: {
        type: Number,
      },
      remainingBalance: {
        type: Number,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Static method to generate unique transaction ID
TransactionSchema.static('generateTransactionId', function (): string {
  const prefix = 'TXN';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
});

// Add a pre-save hook to normalize transaction type
TransactionSchema.pre<ITransaction>('save', function (next) {
  // Ensure type is always uppercase
  if (this.type) {
    this.type = this.type.toUpperCase() as TransactionType;
  }

  // Ensure date is properly set if not already
  if (!this.date) {
    this.date = new Date();
  }

  // If no transactionId is provided, generate one
  if (!this.transactionId) {
    // @ts-ignore
    this.transactionId = this.constructor.generateTransactionId();
  }

  next();
});

const Transaction = mongoose.model<ITransaction, TransactionModel>(
  'Transaction',
  TransactionSchema
);

// Add the static method directly to the model to ensure it's accessible
Transaction.generateTransactionId = function (): string {
  const prefix = 'TXN';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
};

export default Transaction;
