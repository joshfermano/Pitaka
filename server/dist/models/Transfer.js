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
exports.Transfer = exports.TransferRecipient = exports.TransferType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var TransferType;
(function (TransferType) {
    TransferType["INTERNAL"] = "INTERNAL";
    TransferType["EXTERNAL"] = "EXTERNAL";
    TransferType["INTERBANK"] = "INTERBANK";
})(TransferType || (exports.TransferType = TransferType = {}));
const TransferRecipientSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
const TransferSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender ID is required'],
    },
    senderAccountId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Sender account ID is required'],
    },
    recipientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TransferRecipient',
        required: [true, 'Recipient ID is required'],
    },
    recipientAccountId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Transaction',
    },
}, {
    timestamps: true,
});
TransferSchema.static('generateReference', function () {
    const prefix = 'REF';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
});
// Method to calculate transfer fee based on type and amount
TransferSchema.methods.calculateFee = function () {
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
exports.TransferRecipient = mongoose_1.default.model('TransferRecipient', TransferRecipientSchema);
exports.Transfer = mongoose_1.default.model('Transfer', TransferSchema);
