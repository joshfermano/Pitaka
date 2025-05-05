import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBank extends Document {
  name: string;
  code: string;
  logo: string;
  country: string;
  swiftCode?: string;
  routingNumber?: string;
  transferFees: {
    domestic: number;
    international: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BankModel extends Model<IBank> {
  seedInitialData(): Promise<void>;
}

const BankSchema = new Schema<IBank, BankModel>(
  {
    name: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Bank code is required'],
      trim: true,
      unique: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'Philippines',
    },
    swiftCode: {
      type: String,
      trim: true,
    },
    routingNumber: {
      type: String,
      trim: true,
    },
    transferFees: {
      domestic: {
        type: Number,
        default: 25, // ₱25 for domestic transfers
      },
      international: {
        type: Number,
        default: 250, // ₱250 for international transfers
      },
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

// Static method to seed initial bank data
BankSchema.static('seedInitialData', async function (): Promise<void> {
  const banks = [
    {
      name: 'Banco De Oro (BDO)',
      code: 'BDO',
      logo: 'bdo',
      country: 'Philippines',
      swiftCode: 'BNORPHMM',
    },
    {
      name: 'Bank of the Philippine Islands (BPI)',
      code: 'BPI',
      logo: 'bpi',
      country: 'Philippines',
      swiftCode: 'BOPIPHMM',
    },
    {
      name: 'Metrobank',
      code: 'MBTC',
      logo: 'metrobank',
      country: 'Philippines',
      swiftCode: 'MBTCPHMM',
    },
    {
      name: 'UnionBank',
      code: 'UBP',
      logo: 'unionbank',
      country: 'Philippines',
      swiftCode: 'UBPHPHMM',
    },
    {
      name: 'Security Bank',
      code: 'SECB',
      logo: 'securitybank',
      country: 'Philippines',
      swiftCode: 'SETCPHMM',
    },
    {
      name: 'Philippine National Bank (PNB)',
      code: 'PNB',
      logo: 'pnb',
      country: 'Philippines',
      swiftCode: 'PNBMPHMM',
    },
    {
      name: 'Landbank of the Philippines',
      code: 'LBP',
      logo: 'landbank',
      country: 'Philippines',
      swiftCode: 'TLBPPHMM',
    },
    {
      name: 'Rizal Commercial Banking Corporation (RCBC)',
      code: 'RCBC',
      logo: 'rcbc',
      country: 'Philippines',
      swiftCode: 'RCBCPHMM',
    },
    {
      name: 'Eastwest Bank',
      code: 'EWB',
      logo: 'eastwest',
      country: 'Philippines',
      swiftCode: 'EWBCPHMM',
    },
    {
      name: 'China Banking Corporation (Chinabank)',
      code: 'CBC',
      logo: 'chinabank',
      country: 'Philippines',
      swiftCode: 'CHBKPHMM',
    },
  ];

  // Check if banks already exist
  const existingBanks = await this.countDocuments();
  if (existingBanks === 0) {
    await this.insertMany(banks);
    console.log('✅ Initial bank data seeded successfully');
  }
});

export default mongoose.model<IBank, BankModel>('Bank', BankSchema);
