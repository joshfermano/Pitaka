import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TransferType {
  INTERNAL = 'INTERNAL', // Transfer between own accounts
  EXTERNAL = 'EXTERNAL', // Transfer to other Pitaka users
  INTERBANK = 'INTERBANK', // Transfer to other banks
}

export interface ITransferRecipient extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  accountNumber: string;
  bankName?: string; // Only for INTERBANK transfers
  bankCode?: string; // Only for INTERBANK transfers
  isFavorite: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransfer extends Document {
  userId: mongoose.Types.ObjectId; // User ID for the transfer record
  senderId: mongoose.Types.ObjectId; // User ID who initiated the transfer
  senderAccountId: mongoose.Types.ObjectId; // Account ID from which money is transferred
  recipientId: mongoose.Types.ObjectId; // Recipient entity (user or external recipient)
  recipientAccountId?: mongoose.Types.ObjectId; // For internal transfers
  recipientAccountNumber: string; // For all types of transfers
  amount: number;
  fee: number;
  type: TransferType;
  description?: string;
  reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  transactionId?: mongoose.Types.ObjectId; // Reference to Transaction model
  createdAt: Date;
  updatedAt: Date;
  calculateFee(): number;
}

interface TransferModel extends Model<ITransfer> {
  generateReference(): string;
}

const TransferRecipientSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    bankCode: {
      type: String,
      trim: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
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

const TransferSchema = new Schema<ITransfer, TransferModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    senderAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Sender account ID is required'],
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'TransferRecipient',
      required: [true, 'Recipient ID is required'],
    },
    recipientAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
    },
    recipientAccountNumber: {
      type: String,
      required: [true, 'Recipient account number is required'],
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
    type: {
      type: String,
      enum: Object.values(TransferType),
      required: [true, 'Transfer type is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      required: [true, 'Reference number is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
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

TransferSchema.static('generateReference', function (): string {
  const prefix = 'REF';
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
});

// Method to calculate transfer fee based on type and amount
TransferSchema.methods.calculateFee = function (this: ITransfer): number {
  let fee = 0;

  switch (this.type) {
    case TransferType.INTERNAL:
      fee = 0; // No fee for internal transfers
      break;
    case TransferType.EXTERNAL:
      fee = 0; // No fee for transfers to other Pitaka users
      break;
    case TransferType.INTERBANK:
      // Fee is 0.5% of amount with minimum of 15 and maximum of 50
      fee = Math.min(Math.max(this.amount * 0.005, 15), 50);
      break;
  }

  return fee;
};

export const TransferRecipient = mongoose.model<ITransferRecipient>(
  'TransferRecipient',
  TransferRecipientSchema
);
export const Transfer = mongoose.model<ITransfer, TransferModel>(
  'Transfer',
  TransferSchema
);
