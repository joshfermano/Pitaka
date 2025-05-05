import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IQRCode extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  reference: string;
  amount?: number;
  description?: string;
  expiresAt?: Date;
  isOneTime: boolean;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isValid(): boolean;
  markAsUsed(): Promise<void>;
}

interface QRCodeModel extends Model<IQRCode> {
  generateReference(): string;
}

const QRCodeSchema = new Schema<IQRCode, QRCodeModel>(
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
    reference: {
      type: String,
      required: [true, 'Reference code is required'],
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
    },
    isOneTime: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for expiration date
QRCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

QRCodeSchema.methods.isValid = function (this: IQRCode): boolean {
  // Check if active
  if (!this.isActive) return false;

  // Check expiration
  if (this.expiresAt && new Date() > this.expiresAt) return false;

  // Check if one-time use and already used
  if (this.isOneTime && this.usageCount > 0) return false;

  return true;
};

// Method to mark QR code as used
QRCodeSchema.methods.markAsUsed = async function (
  this: IQRCode
): Promise<void> {
  this.usageCount += 1;
  this.lastUsedAt = new Date();

  if (this.isOneTime) {
    this.isActive = false;
  }

  await this.save();
};

QRCodeSchema.static('generateReference', function (): string {
  return 'QR' + uuidv4().substring(0, 8).toUpperCase();
});

export default mongoose.model<IQRCode, QRCodeModel>('QRCode', QRCodeSchema);
