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
exports.CardType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CardType;
(function (CardType) {
    CardType["VISA"] = "VISA";
    CardType["MASTERCARD"] = "MASTERCARD";
    CardType["AMEX"] = "AMEX";
    CardType["DISCOVER"] = "DISCOVER";
    CardType["JCB"] = "JCB";
    CardType["UNION_PAY"] = "UNION_PAY";
})(CardType || (exports.CardType = CardType = {}));
const CardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
    },
    cardNumber: {
        type: String,
        required: [true, 'Card number is required'],
        unique: true,
        trim: true,
        validate: {
            validator: function (v) {
                // Luhn algorithm for card validation
                const digits = v.replace(/\D/g, '');
                let sum = 0;
                let shouldDouble = false;
                for (let i = digits.length - 1; i >= 0; i--) {
                    let digit = parseInt(digits.charAt(i));
                    if (shouldDouble) {
                        digit *= 2;
                        if (digit > 9)
                            digit -= 9;
                    }
                    sum += digit;
                    shouldDouble = !shouldDouble;
                }
                return sum % 10 === 0 && digits.length >= 13;
            },
            message: 'Invalid card number',
        },
    },
    maskedNumber: {
        type: String,
        required: [true, 'Masked number is required'],
        trim: true,
    },
    cardholderName: {
        type: String,
        required: [true, 'Cardholder name is required'],
        trim: true,
    },
    expiryMonth: {
        type: String,
        required: [true, 'Expiry month is required'],
        trim: true,
        validate: {
            validator: function (v) {
                const month = parseInt(v);
                return !isNaN(month) && month >= 1 && month <= 12;
            },
            message: 'Invalid expiry month. Must be between 01-12',
        },
    },
    expiryYear: {
        type: String,
        required: [true, 'Expiry year is required'],
        trim: true,
        validate: {
            validator: function (v) {
                const year = parseInt(v);
                const currentYear = new Date().getFullYear() % 100; // Get last two digits
                return (!isNaN(year) && year >= currentYear && year <= currentYear + 20);
            },
            message: (props) => `Invalid expiry year. Must be between ${new Date().getFullYear() % 100} and ${(new Date().getFullYear() % 100) + 20}`,
        },
    },
    cvv: {
        type: String,
        required: [true, 'CVV is required'],
        trim: true,
        validate: {
            validator: function (v) {
                // Determine the required CVV length based on card type
                // Access the document with 'this' context
                const cardDoc = this;
                const requiredLength = cardDoc.type === CardType.AMEX ? 4 : 3;
                return new RegExp(`^\\d{${requiredLength}}$`).test(v);
            },
            message: 'CVV must be the correct length (3 digits, or 4 for AMEX cards)',
        },
    },
    type: {
        type: String,
        enum: Object.values(CardType),
        required: [true, 'Card type is required'],
    },
    isDefault: {
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
// Pre-save middleware to create masked number
CardSchema.pre('save', function (next) {
    if (this.isModified('cardNumber')) {
        const digits = this.cardNumber.replace(/\D/g, '');
        const last4 = digits.slice(-4);
        // Format based on card type
        if (this.type === CardType.AMEX) {
            this.maskedNumber = `•••• •••••• ${last4}`;
        }
        else {
            this.maskedNumber = `•••• •••• •••• ${last4}`;
        }
    }
    next();
});
// Utility method to determine card type from number
CardSchema.static('detectCardType', function (cardNumber) {
    const cleanedNumber = cardNumber.replace(/\D/g, '');
    // VISA
    if (/^4/.test(cleanedNumber)) {
        return CardType.VISA;
    }
    // Mastercard
    if (/^5[1-5]/.test(cleanedNumber) || /^2[2-7]/.test(cleanedNumber)) {
        return CardType.MASTERCARD;
    }
    // AMEX
    if (/^3[47]/.test(cleanedNumber)) {
        return CardType.AMEX;
    }
    // Discover
    if (/^(6011|65|64[4-9]|622)/.test(cleanedNumber)) {
        return CardType.DISCOVER;
    }
    // JCB
    if (/^35/.test(cleanedNumber)) {
        return CardType.JCB;
    }
    // Union Pay
    if (/^62/.test(cleanedNumber)) {
        return CardType.UNION_PAY;
    }
    return null;
});
exports.default = mongoose_1.default.model('Card', CardSchema);
