"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAlert = exports.Investment = exports.Company = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CompanySchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
const InvestmentSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
const PriceAlertSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
// Method to update investment values based on current company price
InvestmentSchema.methods.updateValues = async function () {
    try {
        const company = await mongoose_1.default.model('Company').findById(this.companyId);
        if (company) {
            // Calculate current value based on company's current price
            this.currentValue = parseFloat((this.shares * company.currentPrice).toFixed(2));
            this.profit = parseFloat((this.currentValue - this.amount).toFixed(2));
            this.profitPercent = parseFloat(((this.profit / this.amount) * 100).toFixed(2));
            console.log(`[Investment] Updated values for investment ${this._id}:`, {
                shares: this.shares,
                companyPrice: company.currentPrice,
                currentValue: this.currentValue,
                profit: this.profit,
                profitPercent: this.profitPercent,
            });
            return await this.save();
        }
        else {
            console.error(`[Investment] Company not found for investment ${this._id}`);
        }
    }
    catch (error) {
        console.error('Error updating investment values:', error);
    }
};
exports.Company = mongoose_1.default.model('Company', CompanySchema);
exports.Investment = mongoose_1.default.model('Investment', InvestmentSchema);
exports.PriceAlert = mongoose_1.default.model('PriceAlert', PriceAlertSchema);
