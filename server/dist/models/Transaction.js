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
exports.TransactionStatus = exports.TransactionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    TransactionType["TRANSFER"] = "TRANSFER";
    TransactionType["TRANSFER_RECEIVED"] = "TRANSFER_RECEIVED";
    TransactionType["INVESTMENT"] = "INVESTMENT";
    TransactionType["PAYMENT"] = "PAYMENT";
    TransactionType["LOAN_DISBURSEMENT"] = "LOAN_DISBURSEMENT";
    TransactionType["LOAN_PAYMENT"] = "LOAN_PAYMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["COMPLETED"] = "COMPLETED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
const TransactionSchema = new mongoose_1.Schema({
    transactionId: {
        type: String,
        required: [true, 'Transaction ID is required'],
        unique: true,
        trim: true,
    },
    userId: {
        type: String,
        required: [true, 'User ID is required'],
    },
    accountId: {
        type: String,
        required: [true, 'Account ID is required'],
    },
    type: {
        type: String,
        enum: Object.values(TransactionType),
        required: [true, 'Transaction type is required'],
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        validate: {
            validator: function (v) {
                return v !== 0;
            },
            message: 'Amount cannot be zero',
        },
    },
    fee: {
        type: Number,
        default: 0,
    },
    fromAccount: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Account',
    },
    toAccount: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Account',
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.PENDING,
    },
    merchantName: {
        type: String,
        trim: true,
    },
    merchantLogo: {
        type: String,
        trim: true,
    },
    merchantCategory: {
        type: String,
        trim: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    currency: {
        type: String,
        default: '₱',
        trim: true,
    },
    loanId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Loan',
    },
    savingsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Savings',
    },
    loanDetails: {
        loanType: {
            type: String,
            trim: true,
        },
        principalAmount: {
            type: Number,
        },
        interestRate: {
            type: String,
            trim: true,
        },
        term: {
            type: String,
            trim: true,
        },
        paymentNumber: {
            type: Number,
        },
        totalPayments: {
            type: Number,
        },
        remainingBalance: {
            type: Number,
        },
    },
}, {
    timestamps: true,
});
// Static method to generate unique transaction ID
TransactionSchema.static('generateTransactionId', function () {
    const prefix = 'TXN';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
});
// Add a pre-save hook to normalize transaction type
TransactionSchema.pre('save', function (next) {
    // Ensure type is always uppercase
    if (this.type) {
        this.type = this.type.toUpperCase();
    }
    // Ensure date is properly set if not already
    if (!this.date) {
        this.date = new Date();
    }
    next();
});
exports.default = mongoose_1.default.model('Transaction', TransactionSchema);
