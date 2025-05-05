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
const mongoose_1 = __importStar(require("mongoose"));
const uuid_1 = require("uuid");
const QRCodeSchema = new mongoose_1.Schema({
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
    reference: {
        type: String,
        required: [true, 'Reference code is required'],
        unique: true,
        trim: true,
    },
    amount: {
        type: Number,
        min: [0, 'Amount cannot be negative'],
    },
    description: {
        type: String,
        trim: true,
    },
    expiresAt: {
        type: Date,
    },
    isOneTime: {
        type: Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    usageCount: {
        type: Number,
        default: 0,
    },
    lastUsedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Index for expiration date
QRCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
QRCodeSchema.methods.isValid = function () {
    // Check if active
    if (!this.isActive)
        return false;
    // Check expiration
    if (this.expiresAt && new Date() > this.expiresAt)
        return false;
    // Check if one-time use and already used
    if (this.isOneTime && this.usageCount > 0)
        return false;
    return true;
};
// Method to mark QR code as used
QRCodeSchema.methods.markAsUsed = async function () {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    if (this.isOneTime) {
        this.isActive = false;
    }
    await this.save();
};
QRCodeSchema.static('generateReference', function () {
    return 'QR' + (0, uuid_1.v4)().substring(0, 8).toUpperCase();
});
exports.default = mongoose_1.default.model('QRCode', QRCodeSchema);
