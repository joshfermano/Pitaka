import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AccountType {
  MAIN = 'MAIN',
  SAVINGS = 'SAVINGS',
  INVESTMENT = 'INVESTMENT',
}

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  type: AccountType;
  name: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Define interface for model statics
interface AccountModel extends Model<IAccount> {
  generateAccountNumber(): Promise<string>;
}

const AccountSchema = new Schema<IAccount, AccountModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(AccountType),
      required: [true, 'Account type is required'],
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: '₱',
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

// Static method to generate unique account number
AccountSchema.static(
  'generateAccountNumber',
  async function (): Promise<string> {
    let accountNumber = '';
    for (let i = 0; i < 10; i++) {
      accountNumber += Math.floor(Math.random() * 10).toString();
    }

    const existingAccount = await this.findOne({ accountNumber });
    if (existingAccount) {
      return this.generateAccountNumber();
    }

    return accountNumber;
  }
);

export default mongoose.model<IAccount, AccountModel>('Account', AccountSchema);
