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
exports.Payment = exports.Biller = exports.BillerCategory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var BillerCategory;
(function (BillerCategory) {
    BillerCategory["ELECTRICITY"] = "ELECTRICITY";
    BillerCategory["WATER"] = "WATER";
    BillerCategory["INTERNET"] = "INTERNET";
    BillerCategory["ENTERTAINMENT"] = "ENTERTAINMENT";
    BillerCategory["INSURANCE"] = "INSURANCE";
    BillerCategory["TELECOM"] = "TELECOM";
    BillerCategory["OTHERS"] = "OTHERS";
})(BillerCategory || (exports.BillerCategory = BillerCategory = {}));
const BillerSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
const PaymentSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    accountId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account ID is required'],
    },
    billerId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
}, {
    timestamps: true,
});
// Static method to generate a reference number
PaymentSchema.static('generateReferenceNumber', function () {
    const prefix = 'PAY';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
});
// Static method to get billers by category
BillerSchema.static('getBillersByCategory', async function (category) {
    return this.find({ category, isActive: true }).sort({ name: 1 });
});
// Static method to get popular billers
BillerSchema.static('getPopularBillers', async function (limit = 5) {
    return this.find({ isActive: true, popularIndex: { $exists: true } })
        .sort({ popularIndex: 1 })
        .limit(limit);
});
exports.Biller = mongoose_1.default.model('Biller', BillerSchema);
exports.Payment = mongoose_1.default.model('Payment', PaymentSchema);
