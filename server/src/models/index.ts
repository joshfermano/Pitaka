import User from './User';
import Account, { AccountType } from './Account';
import Transaction, { TransactionType, TransactionStatus } from './Transaction';
import { Loan, LoanPayment, LoanProduct } from './Loan';
import { Company, Investment } from './Investment';
import SavingsAccount, {
  SavingsTransactionType,
  FrequencyType,
} from './Savings';
import Card, { CardType } from './Card';
import { Transfer, TransferRecipient, TransferType } from './Transfer';
import { Biller, Payment, BillerCategory } from './Payment';
import Bank from './Bank';
import QRCode from './QRCode';

// Seed initial data for banks
Bank.seedInitialData().catch((err) => {
  console.error('Error seeding bank data:', err);
});

// Types
export {
  AccountType,
  TransactionType,
  TransactionStatus,
  CardType,
  TransferType,
  BillerCategory,
  SavingsTransactionType,
  FrequencyType,
};

// Models
export {
  User,
  Account,
  Transaction,
  Loan,
  LoanPayment,
  LoanProduct,
  Company,
  Investment,
  SavingsAccount,
  Card,
  Transfer,
  TransferRecipient,
  Biller,
  Payment,
  Bank,
  QRCode,
};

export default {
  User,
  Account,
  Transaction,
  Loan,
  LoanPayment,
  LoanProduct,
  Company,
  Investment,
  SavingsAccount,
  Card,
  Transfer,
  TransferRecipient,
  Biller,
  Payment,
  Bank,
  QRCode,
};
