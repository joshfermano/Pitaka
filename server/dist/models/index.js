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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCode = exports.Bank = exports.Payment = exports.Biller = exports.TransferRecipient = exports.Transfer = exports.Card = exports.SavingsAccount = exports.Investment = exports.Company = exports.LoanProduct = exports.LoanPayment = exports.Loan = exports.Transaction = exports.Account = exports.User = exports.SavingsTransactionType = exports.BillerCategory = exports.TransferType = exports.CardType = exports.TransactionStatus = exports.TransactionType = exports.AccountType = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Account_1 = __importStar(require("./Account"));
exports.Account = Account_1.default;
Object.defineProperty(exports, "AccountType", { enumerable: true, get: function () { return Account_1.AccountType; } });
const Transaction_1 = __importStar(require("./Transaction"));
exports.Transaction = Transaction_1.default;
Object.defineProperty(exports, "TransactionType", { enumerable: true, get: function () { return Transaction_1.TransactionType; } });
Object.defineProperty(exports, "TransactionStatus", { enumerable: true, get: function () { return Transaction_1.TransactionStatus; } });
const Loan_1 = require("./Loan");
Object.defineProperty(exports, "Loan", { enumerable: true, get: function () { return Loan_1.Loan; } });
Object.defineProperty(exports, "LoanPayment", { enumerable: true, get: function () { return Loan_1.LoanPayment; } });
Object.defineProperty(exports, "LoanProduct", { enumerable: true, get: function () { return Loan_1.LoanProduct; } });
const Investment_1 = require("./Investment");
Object.defineProperty(exports, "Company", { enumerable: true, get: function () { return Investment_1.Company; } });
Object.defineProperty(exports, "Investment", { enumerable: true, get: function () { return Investment_1.Investment; } });
const Savings_1 = __importStar(require("./Savings"));
exports.SavingsAccount = Savings_1.default;
Object.defineProperty(exports, "SavingsTransactionType", { enumerable: true, get: function () { return Savings_1.SavingsTransactionType; } });
const Card_1 = __importStar(require("./Card"));
exports.Card = Card_1.default;
Object.defineProperty(exports, "CardType", { enumerable: true, get: function () { return Card_1.CardType; } });
const Transfer_1 = require("./Transfer");
Object.defineProperty(exports, "Transfer", { enumerable: true, get: function () { return Transfer_1.Transfer; } });
Object.defineProperty(exports, "TransferRecipient", { enumerable: true, get: function () { return Transfer_1.TransferRecipient; } });
Object.defineProperty(exports, "TransferType", { enumerable: true, get: function () { return Transfer_1.TransferType; } });
const Payment_1 = require("./Payment");
Object.defineProperty(exports, "Biller", { enumerable: true, get: function () { return Payment_1.Biller; } });
Object.defineProperty(exports, "Payment", { enumerable: true, get: function () { return Payment_1.Payment; } });
Object.defineProperty(exports, "BillerCategory", { enumerable: true, get: function () { return Payment_1.BillerCategory; } });
const Bank_1 = __importDefault(require("./Bank"));
exports.Bank = Bank_1.default;
const QRCode_1 = __importDefault(require("./QRCode"));
exports.QRCode = QRCode_1.default;
// Seed initial data for banks
Bank_1.default.seedInitialData().catch((err) => {
    console.error('Error seeding bank data:', err);
});
exports.default = {
    User: User_1.default,
    Account: Account_1.default,
    Transaction: Transaction_1.default,
    Loan: Loan_1.Loan,
    LoanPayment: Loan_1.LoanPayment,
    LoanProduct: Loan_1.LoanProduct,
    Company: Investment_1.Company,
    Investment: Investment_1.Investment,
    SavingsAccount: Savings_1.default,
    Card: Card_1.default,
    Transfer: Transfer_1.Transfer,
    TransferRecipient: Transfer_1.TransferRecipient,
    Biller: Payment_1.Biller,
    Payment: Payment_1.Payment,
    Bank: Bank_1.default,
    QRCode: QRCode_1.default,
};
