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
exports.AccountType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var AccountType;
(function (AccountType) {
    AccountType["MAIN"] = "MAIN";
    AccountType["SAVINGS"] = "SAVINGS";
    AccountType["INVESTMENT"] = "INVESTMENT";
})(AccountType || (exports.AccountType = AccountType = {}));
const AccountSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        unique: true,
        trim: true,
    },
    type: {
        type: String,
        enum: Object.values(AccountType),
        required: [true, 'Account type is required'],
    },
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative'],
    },
    currency: {
        type: String,
        default: '₱',
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Static method to generate unique account number
AccountSchema.static('generateAccountNumber', async function () {
    let accountNumber = '';
    for (let i = 0; i < 10; i++) {
        accountNumber += Math.floor(Math.random() * 10).toString();
    }
    const existingAccount = await this.findOne({ accountNumber });
    if (existingAccount) {
        return this.generateAccountNumber();
    }
    return accountNumber;
});
exports.default = mongoose_1.default.model('Account', AccountSchema);
