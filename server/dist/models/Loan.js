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
exports.Loan = exports.LoanPayment = exports.LoanProduct = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LoanProductSchema = new mongoose_1.Schema({
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
}, {
    timestamps: true,
});
const LoanPaymentSchema = new mongoose_1.Schema({
    loanId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
}, {
    timestamps: true,
});
const LoanSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    loanProductId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'LoanPayment',
        },
    ],
}, {
    timestamps: true,
});
// Method to calculate loan progress
LoanSchema.methods.calculateProgress = function () {
    if (this.amount > 0) {
        this.progress = Math.min((this.paid / this.amount) * 100, 100);
    }
};
// Method to update loan after payment
LoanSchema.methods.applyPayment = function (paymentAmount) {
    this.paid += paymentAmount;
    this.remaining = Math.max(this.amount - this.paid, 0);
    this.calculateProgress();
    if (this.remaining === 0) {
        this.status = 'COMPLETED';
    }
};
exports.LoanProduct = mongoose_1.default.model('LoanProduct', LoanProductSchema);
exports.LoanPayment = mongoose_1.default.model('LoanPayment', LoanPaymentSchema);
exports.Loan = mongoose_1.default.model('Loan', LoanSchema);
