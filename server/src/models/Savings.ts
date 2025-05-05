import mongoose, { Schema, Document } from 'mongoose';

export enum SavingsTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTEREST = 'INTEREST',
}

export type FrequencyType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'NONE';

export interface ISavingsTransaction {
  date: Date;
  amount: number;
  type: SavingsTransactionType;
}

export interface IAutoTransfer {
  enabled: boolean;
  amount: number;
  frequency: FrequencyType;
  nextDate: Date | null;
}

export interface ISavingsAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  name: string;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  progress: number;
  endDate: Date;
  interestRate: number;
  transactions: ISavingsTransaction[];
  autoTransfer: IAutoTransfer;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsTransactionSchema: Schema = new Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
  },
  type: {
    type: String,
    enum: Object.values(SavingsTransactionType),
    required: [true, 'Transaction type is required'],
  },
});

const AutoTransferSchema: Schema = new Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  amount: {
    type: Number,
    default: 0,
  },
  frequency: {
    type: String,
    enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'NONE'],
    default: 'NONE',
  },
  nextDate: {
    type: Date,
    default: null,
  },
});

const SavingsAccountSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Savings account name is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: 'piggy-bank',
      trim: true,
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be greater than 0'],
    },
    progress: {
      type: Number,
      default: 0,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    interestRate: {
      type: Number,
      default: 0.05, // 5% per annum
    },
    transactions: [SavingsTransactionSchema],
    autoTransfer: {
      type: AutoTransferSchema,
      default: () => ({}),
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate progress
SavingsAccountSchema.pre<ISavingsAccount>('save', function (next) {
  if (this.targetAmount > 0) {
    this.progress = Math.min(this.currentAmount / this.targetAmount, 1);
  }
  next();
});

export default mongoose.model<ISavingsAccount>(
  'SavingsAccount',
  SavingsAccountSchema
);
