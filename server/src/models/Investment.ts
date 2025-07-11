import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  logoUrl?: string;
  sector?: string;
  industry?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvestment extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  shares: number;
  amount: number; // Total cost basis
  purchaseDate: Date;
  purchasePrice: number; // Price per share at purchase
  currentValue: number;
  profit: number;
  profitPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPriceAlert extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW';
  value: number;
  active: boolean;
  triggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    symbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      trim: true,
      unique: true,
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
    },
    previousClose: {
      type: Number,
      required: [true, 'Previous close price is required'],
    },
    change: {
      type: Number,
      required: [true, 'Price change is required'],
    },
    changePercent: {
      type: Number,
      required: [true, 'Percentage change is required'],
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
    },
    industry: {
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

const InvestmentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
    shares: {
      type: Number,
      required: [true, 'Number of shares is required'],
      min: [0.001, 'Shares must be greater than 0'],
    },
    amount: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Cost cannot be negative'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price per share is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    profit: {
      type: Number,
      default: 0,
    },
    profitPercent: {
      type: Number,
      default: 0,
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

const PriceAlertSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    type: {
      type: String,
      enum: ['PRICE_ABOVE', 'PRICE_BELOW'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    triggered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to update investment values based on current company price
InvestmentSchema.methods.updateValues = async function (this: IInvestment) {
  try {
    const company = await mongoose.model('Company').findById(this.companyId);
    if (company) {
      // Calculate current value based on company's current price
      this.currentValue = parseFloat(
        (this.shares * company.currentPrice).toFixed(2)
      );
      this.profit = parseFloat((this.currentValue - this.amount).toFixed(2));
      this.profitPercent = parseFloat(
        ((this.profit / this.amount) * 100).toFixed(2)
      );

      console.log(`[Investment] Updated values for investment ${this._id}:`, {
        shares: this.shares,
        companyPrice: company.currentPrice,
        currentValue: this.currentValue,
        profit: this.profit,
        profitPercent: this.profitPercent,
      });

      return await this.save();
    } else {
      console.error(
        `[Investment] Company not found for investment ${this._id}`
      );
    }
  } catch (error) {
    console.error('Error updating investment values:', error);
  }
};

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
export const Investment = mongoose.model<IInvestment>(
  'Investment',
  InvestmentSchema
);
export const PriceAlert = mongoose.model<IPriceAlert>(
  'PriceAlert',
  PriceAlertSchema
);
