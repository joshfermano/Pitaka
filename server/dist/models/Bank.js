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
const BankSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
        unique: true,
    },
    code: {
        type: String,
        required: [true, 'Bank code is required'],
        trim: true,
        unique: true,
    },
    logo: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        default: 'Philippines',
    },
    swiftCode: {
        type: String,
        trim: true,
    },
    routingNumber: {
        type: String,
        trim: true,
    },
    transferFees: {
        domestic: {
            type: Number,
            default: 25, // ₱25 for domestic transfers
        },
        international: {
            type: Number,
            default: 250, // ₱250 for international transfers
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});
// Static method to seed initial bank data
BankSchema.static('seedInitialData', async function () {
    const banks = [
        {
            name: 'Banco De Oro (BDO)',
            code: 'BDO',
            logo: 'bdo',
            country: 'Philippines',
            swiftCode: 'BNORPHMM',
        },
        {
            name: 'Bank of the Philippine Islands (BPI)',
            code: 'BPI',
            logo: 'bpi',
            country: 'Philippines',
            swiftCode: 'BOPIPHMM',
        },
        {
            name: 'Metrobank',
            code: 'MBTC',
            logo: 'metrobank',
            country: 'Philippines',
            swiftCode: 'MBTCPHMM',
        },
        {
            name: 'UnionBank',
            code: 'UBP',
            logo: 'unionbank',
            country: 'Philippines',
            swiftCode: 'UBPHPHMM',
        },
        {
            name: 'Security Bank',
            code: 'SECB',
            logo: 'securitybank',
            country: 'Philippines',
            swiftCode: 'SETCPHMM',
        },
        {
            name: 'Philippine National Bank (PNB)',
            code: 'PNB',
            logo: 'pnb',
            country: 'Philippines',
            swiftCode: 'PNBMPHMM',
        },
        {
            name: 'Landbank of the Philippines',
            code: 'LBP',
            logo: 'landbank',
            country: 'Philippines',
            swiftCode: 'TLBPPHMM',
        },
        {
            name: 'Rizal Commercial Banking Corporation (RCBC)',
            code: 'RCBC',
            logo: 'rcbc',
            country: 'Philippines',
            swiftCode: 'RCBCPHMM',
        },
        {
            name: 'Eastwest Bank',
            code: 'EWB',
            logo: 'eastwest',
            country: 'Philippines',
            swiftCode: 'EWBCPHMM',
        },
        {
            name: 'China Banking Corporation (Chinabank)',
            code: 'CBC',
            logo: 'chinabank',
            country: 'Philippines',
            swiftCode: 'CHBKPHMM',
        },
    ];
    // Check if banks already exist
    const existingBanks = await this.countDocuments();
    if (existingBanks === 0) {
        await this.insertMany(banks);
        console.log('✅ Initial bank data seeded successfully');
    }
});
exports.default = mongoose_1.default.model('Bank', BankSchema);
