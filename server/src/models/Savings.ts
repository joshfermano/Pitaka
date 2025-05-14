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
    enum: {
      values: [
        'WEEKLY',
        'MONTHLY',
        'QUARTERLY',
        'NONE',
        'weekly',
        'monthly',
        'quarterly',
        'none',
      ],
      message: '{VALUE} is not a valid frequency',
    },
    default: 'NONE',
    // Custom setter to normalize values
    set: (value: string) => {
      if (!value) return 'NONE';
      return value.toUpperCase();
    },
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

// Pre-save middleware to calculate progress and normalize data
SavingsAccountSchema.pre<ISavingsAccount>('save', function (next) {
  // Calculate progress
  if (this.targetAmount > 0) {
    this.progress = Math.min(this.currentAmount / this.targetAmount, 1);
  }

  // Normalize autoTransfer frequency to valid enum values
  if (this.autoTransfer && this.autoTransfer.frequency) {
    const frequency = this.autoTransfer.frequency.toString().toUpperCase();

    // Validate against enum values
    if (!['WEEKLY', 'MONTHLY', 'QUARTERLY', 'NONE'].includes(frequency)) {
      // Default to NONE for invalid values
      this.autoTransfer.frequency = 'NONE' as FrequencyType;
    } else {
      // Set normalized value
      this.autoTransfer.frequency = frequency as FrequencyType;
    }
  }

  next();
});

export default mongoose.model<ISavingsAccount>(
  'SavingsAccount',
  SavingsAccountSchema
);
