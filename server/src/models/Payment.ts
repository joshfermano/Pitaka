import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BillerCategory {
  ELECTRICITY = 'ELECTRICITY',
  WATER = 'WATER',
  INTERNET = 'INTERNET',
  ENTERTAINMENT = 'ENTERTAINMENT',
  INSURANCE = 'INSURANCE',
  TELECOM = 'TELECOM',
  OTHERS = 'OTHERS',
}

export interface IBiller extends Document {
  name: string;
  category: BillerCategory;
  logo: string;
  accountNumberLabel: string;
  accountNumberMask?: string;
  accountNumberLength?: number;
  minimumAmount: number;
  maximumAmount: number;
  convenienceFee?: number;
  popularIndex?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  billerId: mongoose.Types.ObjectId;
  billerName: string;
  accountNumber: string;
  amount: number;
  fee: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  referenceNumber: string;
  transactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface BillerModel extends Model<IBiller> {
  getBillersByCategory(category: BillerCategory): Promise<IBiller[]>;
  getPopularBillers(limit?: number): Promise<IBiller[]>;
}

interface PaymentModel extends Model<IPayment> {
  generateReferenceNumber(): string;
}

const BillerSchema = new Schema<IBiller, BillerModel>(
  {
    name: {
      type: String,
      required: [true, 'Biller name is required'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      enum: Object.values(BillerCategory),
      required: [true, 'Biller category is required'],
    },
    logo: {
      type: String,
      required: [true, 'Logo is required'],
      trim: true,
    },
    accountNumberLabel: {
      type: String,
      required: [true, 'Account number label is required'],
      trim: true,
    },
    accountNumberMask: {
      type: String,
      trim: true,
    },
    accountNumberLength: {
      type: Number,
    },
    minimumAmount: {
      type: Number,
      required: [true, 'Minimum amount is required'],
      min: [0, 'Minimum amount cannot be negative'],
    },
    maximumAmount: {
      type: Number,
      required: [true, 'Maximum amount is required'],
      min: [0, 'Maximum amount cannot be negative'],
    },
    convenienceFee: {
      type: Number,
      default: 0,
    },
    popularIndex: {
      type: Number,
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

const PaymentSchema = new Schema<IPayment, PaymentModel>(
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
    billerId: {
      type: Schema.Types.ObjectId,
      ref: 'Biller',
      required: [true, 'Biller ID is required'],
    },
    billerName: {
      type: String,
      required: [true, 'Biller name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    fee: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    referenceNumber: {
      type: String,
      required: [true, 'Reference number is required'],
      unique: true,
      trim: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  {
    timestamps: true,
  }
);

// Static method to generate a reference number
PaymentSchema.static('generateReferenceNumber', function (): string {
  const prefix = 'PAY';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
});

// Static method to get billers by category
BillerSchema.static(
  'getBillersByCategory',
  async function (category: BillerCategory): Promise<IBiller[]> {
    return this.find({ category, isActive: true }).sort({ name: 1 });
  }
);

// Static method to get popular billers
BillerSchema.static(
  'getPopularBillers',
  async function (limit: number = 5): Promise<IBiller[]> {
    return this.find({ isActive: true, popularIndex: { $exists: true } })
      .sort({ popularIndex: 1 })
      .limit(limit);
  }
);

export const Biller = mongoose.model<IBiller, BillerModel>(
  'Biller',
  BillerSchema
);
export const Payment = mongoose.model<IPayment, PaymentModel>(
  'Payment',
  PaymentSchema
);
