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
exports.SavingsTransactionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var SavingsTransactionType;
(function (SavingsTransactionType) {
    SavingsTransactionType["DEPOSIT"] = "DEPOSIT";
    SavingsTransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    SavingsTransactionType["INTEREST"] = "INTEREST";
})(SavingsTransactionType || (exports.SavingsTransactionType = SavingsTransactionType = {}));
const SavingsTransactionSchema = new mongoose_1.Schema({
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
const AutoTransferSchema = new mongoose_1.Schema({
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
        enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'NONE'],
        default: 'NONE',
    },
    nextDate: {
        type: Date,
        default: null,
    },
});
const SavingsAccountSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
// Pre-save middleware to calculate progress
SavingsAccountSchema.pre('save', function (next) {
    if (this.targetAmount > 0) {
        this.progress = Math.min(this.currentAmount / this.targetAmount, 1);
    }
    next();
});
exports.default = mongoose_1.default.model('SavingsAccount', SavingsAccountSchema);
