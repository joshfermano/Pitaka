import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoanProduct extends Document {
  title: string;
  interest: string;
  minAmount: number;
  maxAmount: number;
  term: string;
  icon: string;
  color: string;
  description: string;
  requirements: string[];
  features: { title: string; description: string }[];
  eligibility: string[];
  documents: string[];
  faq: { question: string; answer: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanPayment extends Document {
  loanId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  loanProductId: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  paid: number;
  remaining: number;
  nextPayment: number;
  dueDate: Date;
  progress: number;
  disbursementDate: Date;
  term: string;
  interest: string;
  purpose: string;
  status:
    | 'PENDING'
    | 'APPROVED'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED';
  accountNumber?: string;
  approvalDate?: Date;
  paymentFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  payments: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  calculateProgress(): void;
  applyPayment(paymentAmount: number): void;
}

interface LoanProductModel extends Model<ILoanProduct> {}
interface LoanPaymentModel extends Model<ILoanPayment> {}
interface LoanModel extends Model<ILoan> {}

const LoanProductSchema = new Schema<ILoanProduct, LoanProductModel>(
  {
    title: {
      type: String,
      required: [true, 'Loan title is required'],
      trim: true,
    },
    interest: {
      type: String,
      required: [true, 'Interest rate is required'],
      trim: true,
    },
    minAmount: {
      type: Number,
      required: [true, 'Minimum amount is required'],
      min: [0, 'Minimum amount cannot be negative'],
    },
    maxAmount: {
      type: Number,
      required: [true, 'Maximum amount is required'],
      min: [0, 'Maximum amount cannot be negative'],
    },
    term: {
      type: String,
      required: [true, 'Loan term is required'],
      trim: true,
    },
    icon: {
      type: String,
      required: [true, 'Icon is required'],
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    features: [
      {
        title: {
          type: String,
          required: [true, 'Feature title is required'],
          trim: true,
        },
        description: {
          type: String,
          required: [true, 'Feature description is required'],
          trim: true,
        },
      },
    ],
    eligibility: [
      {
        type: String,
        trim: true,
      },
    ],
    documents: [
      {
        type: String,
        trim: true,
      },
    ],
    faq: [
      {
        question: {
          type: String,
          required: [true, 'FAQ question is required'],
          trim: true,
        },
        answer: {
          type: String,
          required: [true, 'FAQ answer is required'],
          trim: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const LoanPaymentSchema = new Schema<ILoanPayment, LoanPaymentModel>(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'Loan',
      required: [true, 'Loan ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
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

const LoanSchema = new Schema<ILoan, LoanModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    loanProductId: {
      type: Schema.Types.ObjectId,
      ref: 'LoanProduct',
      required: [true, 'Loan product ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Loan title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount cannot be negative'],
    },
    paid: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    remaining: {
      type: Number,
      required: [true, 'Remaining amount is required'],
      min: [0, 'Remaining amount cannot be negative'],
    },
    nextPayment: {
      type: Number,
      required: [true, 'Next payment amount is required'],
      min: [0, 'Next payment amount cannot be negative'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100%'],
    },
    disbursementDate: {
      type: Date,
      required: [true, 'Disbursement date is required'],
    },
    term: {
      type: String,
      required: [true, 'Term is required'],
      trim: true,
    },
    interest: {
      type: String,
      required: [true, 'Interest rate is required'],
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, 'Loan purpose is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'APPROVED',
        'ACTIVE',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'PENDING',
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    approvalDate: {
      type: Date,
    },
    paymentFrequency: {
      type: String,
      enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'],
      default: 'MONTHLY',
    },
    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'LoanPayment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Method to calculate loan progress
LoanSchema.methods.calculateProgress = function (this: ILoan): void {
  if (this.amount > 0) {
    this.progress = Math.min((this.paid / this.amount) * 100, 100);
  }
};

// Method to update loan after payment
LoanSchema.methods.applyPayment = function (
  this: ILoan,
  paymentAmount: number
): void {
  this.paid += paymentAmount;
  this.remaining = Math.max(this.amount - this.paid, 0);
  this.calculateProgress();

  if (this.remaining === 0) {
    this.status = 'COMPLETED';
  }
};

export const LoanProduct = mongoose.model<ILoanProduct, LoanProductModel>(
  'LoanProduct',
  LoanProductSchema
);
export const LoanPayment = mongoose.model<ILoanPayment, LoanPaymentModel>(
  'LoanPayment',
  LoanPaymentSchema
);
export const Loan = mongoose.model<ILoan, LoanModel>('Loan', LoanSchema);
