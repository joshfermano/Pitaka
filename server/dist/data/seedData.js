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
exports.seedDatabase = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models = __importStar(require("../models"));
/**
 * Seed the database with initial data for testing
 */
const seedDatabase = async () => {
    try {
        const userCount = await models.User.countDocuments();
        if (userCount > 0) {
            console.log('Database already seeded. Skipping seeding process.');
            return;
        }
        console.log('🌱 Seeding database with initial data...');
        // Create users
        const password = await bcryptjs_1.default.hash('password123', 10);
        const users = await models.User.create([
            {
                username: 'joshfermano',
                email: 'josh@example.com',
                password,
                firstName: 'Josh Khovick',
                lastName: 'Fermano',
                phoneNumber: '+63 912 345 6789',
                dateOfBirth: new Date('1990-01-01'),
                address: {
                    street: '123 Main St',
                    city: 'Manila',
                    state: 'Metro Manila',
                    zipCode: '1000',
                    country: 'Philippines',
                },
            },
            {
                username: 'mariasantos',
                email: 'maria.santos@example.com',
                password,
                firstName: 'Maria',
                lastName: 'Santos',
                phoneNumber: '+63 923 456 7890',
                dateOfBirth: new Date('1992-05-15'),
                address: {
                    street: '456 Rizal Ave',
                    city: 'Quezon City',
                    state: 'Metro Manila',
                    zipCode: '1100',
                    country: 'Philippines',
                },
            },
        ]);
        // Create accounts
        const mainAccount1 = await models.Account.create({
            userId: users[0]._id,
            accountNumber: '1234567890',
            type: models.AccountType.MAIN,
            name: 'Main Account',
            balance: 100000,
            currency: '₱',
        });
        const savingsAccount1 = await models.Account.create({
            userId: users[0]._id,
            accountNumber: '0987654321',
            type: models.AccountType.SAVINGS,
            name: 'Emergency Fund',
            balance: 50000,
            currency: '₱',
        });
        const investmentAccount1 = await models.Account.create({
            userId: users[0]._id,
            accountNumber: '6789012345',
            type: models.AccountType.INVESTMENT,
            name: 'Investment Account',
            balance: 75000,
            currency: '₱',
        });
        const mainAccount2 = await models.Account.create({
            userId: users[1]._id,
            accountNumber: '5432167890',
            type: models.AccountType.MAIN,
            name: 'Main Account',
            balance: 80000,
            currency: '₱',
        });
        // Create savings accounts
        await models.SavingsAccount.create({
            userId: users[0]._id,
            accountId: savingsAccount1._id,
            name: 'Dream Vacation',
            icon: 'airplane',
            currentAmount: 25000,
            targetAmount: 50000,
            endDate: new Date('2023-12-31'),
            interestRate: 0.05,
            transactions: [
                {
                    date: new Date('2023-01-15'),
                    amount: 10000,
                    type: models.SavingsTransactionType.DEPOSIT,
                },
                {
                    date: new Date('2023-02-15'),
                    amount: 5000,
                    type: models.SavingsTransactionType.DEPOSIT,
                },
                {
                    date: new Date('2023-03-15'),
                    amount: 5000,
                    type: models.SavingsTransactionType.DEPOSIT,
                },
                {
                    date: new Date('2023-04-15'),
                    amount: 5000,
                    type: models.SavingsTransactionType.DEPOSIT,
                },
                {
                    date: new Date('2023-04-30'),
                    amount: 125,
                    type: models.SavingsTransactionType.INTEREST,
                },
            ],
            autoTransfer: {
                enabled: true,
                amount: 5000,
                frequency: 'MONTHLY',
                nextDate: new Date('2023-05-15'),
            },
            notes: 'Saving for a trip to Japan in December',
        });
        // Create companies for investments
        const companies = await models.Company.create([
            {
                name: 'PLDT Inc.',
                symbol: 'TEL',
                currentPrice: 1250.5,
                previousClose: 1230.0,
                change: 20.5,
                changePercent: 1.67,
                sector: 'Telecommunications',
            },
            {
                name: 'SM Investments',
                symbol: 'SM',
                currentPrice: 925.0,
                previousClose: 915.0,
                change: 10.0,
                changePercent: 1.09,
                sector: 'Holding Firms',
            },
            {
                name: 'Jollibee Foods',
                symbol: 'JFC',
                currentPrice: 186.5,
                previousClose: 184.8,
                change: 1.7,
                changePercent: 0.92,
                sector: 'Consumer Services',
            },
        ]);
        await models.Investment.create([
            {
                userId: users[0]._id,
                companyId: companies[0]._id,
                shares: 10,
                amount: 12000.0,
                purchaseDate: new Date('2023-05-15'),
                purchasePrice: 1200.0,
                currentValue: 12505.0,
                profit: 505.0,
                profitPercent: 4.21,
            },
            {
                userId: users[0]._id,
                companyId: companies[1]._id,
                shares: 15,
                amount: 13500.0,
                purchaseDate: new Date('2023-06-22'),
                purchasePrice: 900.0,
                currentValue: 13875.0,
                profit: 375.0,
                profitPercent: 2.78,
            },
        ]);
        const loanProducts = await models.LoanProduct.create([
            {
                title: 'Personal Loan',
                interest: '10.5% p.a.',
                minAmount: 10000,
                maxAmount: 500000,
                term: '6-36 months',
                icon: 'account',
                color: '#4F46E5',
                description: 'Get the funds you need for personal expenses, debt consolidation, home improvements, or any other financial needs with our flexible personal loan options.',
                requirements: [
                    'Must be 21-65 years old',
                    'Minimum monthly income of ₱15,000',
                    'Must be a Filipino citizen or resident foreigner',
                    'At least 6 months with current employer',
                ],
                features: [
                    {
                        title: 'Flexible Terms',
                        description: 'Choose repayment terms that fit your budget, from 6 to 36 months.',
                    },
                    {
                        title: 'Competitive Rates',
                        description: 'Our competitive interest rates start at 10.5% per annum.',
                    },
                ],
                eligibility: [
                    'Filipino citizen or resident foreigner',
                    'Age 21-65 years old',
                    'Regular employment with at least 6 months tenure',
                    'Minimum monthly income of ₱15,000',
                ],
                documents: [
                    'Valid government-issued ID',
                    'Proof of income (latest 3 months pay slips)',
                    'Certificate of Employment',
                    'Latest 3 months bank statements',
                ],
                faq: [
                    {
                        question: 'How much can I borrow?',
                        answer: 'You can borrow between ₱10,000 to ₱500,000 depending on your income and credit assessment.',
                    },
                    {
                        question: 'How long does the approval process take?',
                        answer: 'Upon complete submission of requirements, the approval process typically takes 24-48 hours.',
                    },
                ],
            },
            {
                title: 'Auto Loan',
                interest: '7.25% p.a.',
                minAmount: 100000,
                maxAmount: 1000000,
                term: '12-60 months',
                icon: 'car',
                color: '#059669',
                description: 'Finance your dream car with our competitive auto loan options. Get on the road faster with quick approval and flexible terms.',
                requirements: [
                    'Must be 21-65 years old',
                    'Minimum monthly income of ₱25,000',
                    'Must be a Filipino citizen or resident foreigner',
                    'At least 1 year with current employer',
                ],
                features: [
                    {
                        title: 'Low Interest Rates',
                        description: 'Competitive interest rates starting from 7.25% per annum.',
                    },
                    {
                        title: 'Flexible Terms',
                        description: 'Choose repayment terms from 12 to 60 months.',
                    },
                ],
                eligibility: [
                    'Filipino citizen or resident foreigner',
                    'Age 21-65 years old',
                    'Regular employment with at least 1 year tenure',
                    'Minimum monthly income of ₱25,000',
                ],
                documents: [
                    'Valid government-issued ID',
                    'Proof of income (latest 3 months pay slips)',
                    'Certificate of Employment',
                    'Vehicle details and invoice',
                ],
                faq: [
                    {
                        question: 'What vehicles can I finance?',
                        answer: 'You can finance new or used vehicles up to 7 years old from authorized dealers.',
                    },
                    {
                        question: 'What is the minimum down payment?',
                        answer: 'The minimum down payment is 20% of the vehicle price.',
                    },
                ],
            },
        ]);
        // Create active loans
        const personalLoan = await models.Loan.create({
            userId: users[0]._id,
            loanProductId: loanProducts[0]._id,
            title: 'Personal Loan',
            amount: 250000,
            paid: 75000,
            remaining: 175000,
            nextPayment: 8750,
            dueDate: new Date('2023-10-15'),
            progress: 30,
            disbursementDate: new Date('2023-03-15'),
            term: '36 months',
            interest: '10.5%',
            status: 'ACTIVE',
            accountNumber: '1234-5678-9012',
            approvalDate: new Date('2023-03-10'),
            paymentFrequency: 'MONTHLY',
            payments: [],
        });
        // Create loan payments
        const loanPayments = await models.LoanPayment.create([
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-09-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-08-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-07-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-06-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-05-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-04-15'),
                status: 'COMPLETED',
            },
            {
                loanId: personalLoan._id,
                amount: 8750,
                date: new Date('2023-03-15'),
                status: 'COMPLETED',
            },
        ]);
        // Update loan with payments
        await models.Loan.findByIdAndUpdate(personalLoan._id, {
            payments: loanPayments.map((payment) => payment._id),
        });
        // Create billers
        const billers = await models.Biller.create([
            {
                name: 'Meralco',
                category: models.BillerCategory.ELECTRICITY,
                logo: 'meralco',
                accountNumberLabel: 'Customer Account Number',
                accountNumberMask: '####-####-####',
                accountNumberLength: 12,
                minimumAmount: 50,
                maximumAmount: 50000,
                convenienceFee: 7.5,
                popularIndex: 1,
            },
            {
                name: 'Maynilad',
                category: models.BillerCategory.WATER,
                logo: 'maynilad',
                accountNumberLabel: 'Contract Account Number',
                accountNumberMask: '##########',
                accountNumberLength: 10,
                minimumAmount: 50,
                maximumAmount: 30000,
                popularIndex: 2,
            },
            {
                name: 'Netflix',
                category: models.BillerCategory.ENTERTAINMENT,
                logo: 'netflix',
                accountNumberLabel: 'Email Address',
                minimumAmount: 149,
                maximumAmount: 549,
                popularIndex: 4,
            },
        ]);
        // Create recent transactions
        await models.Transaction.create([
            {
                transactionId: 'TXN123456789',
                type: models.TransactionType.PAYMENT,
                amount: 5.99,
                fee: 0,
                fromAccount: mainAccount1._id,
                description: 'App Store Purchase',
                status: models.TransactionStatus.COMPLETED,
                merchantName: 'Apple Store',
                merchantLogo: 'apple',
                merchantCategory: 'Entertainment',
                date: new Date('2023-07-15T14:30:00Z'),
                currency: '₱',
            },
            {
                transactionId: 'TXN123456790',
                type: models.TransactionType.DEPOSIT,
                amount: 10000,
                fee: 0,
                toAccount: mainAccount1._id,
                description: 'Salary Deposit',
                status: models.TransactionStatus.COMPLETED,
                date: new Date('2023-07-01T09:00:00Z'),
                currency: '₱',
            },
            {
                transactionId: 'TXN123456791',
                type: models.TransactionType.TRANSFER,
                amount: 5000,
                fee: 0,
                fromAccount: mainAccount1._id,
                toAccount: savingsAccount1._id,
                description: 'Transfer to Savings',
                status: models.TransactionStatus.COMPLETED,
                date: new Date('2023-07-02T11:45:00Z'),
                currency: '₱',
            },
            {
                transactionId: 'TXN123456792',
                type: models.TransactionType.WITHDRAWAL,
                amount: 2000,
                fee: 0,
                fromAccount: mainAccount1._id,
                description: 'ATM Withdrawal',
                status: models.TransactionStatus.COMPLETED,
                date: new Date('2023-07-05T15:30:00Z'),
                currency: '₱',
            },
            {
                transactionId: 'TXN123456793',
                type: models.TransactionType.LOAN_DISBURSEMENT,
                amount: 250000,
                fee: 2500,
                toAccount: mainAccount1._id,
                description: 'Personal Loan Disbursement',
                status: models.TransactionStatus.COMPLETED,
                date: new Date('2023-03-15T10:00:00Z'),
                currency: '₱',
                loanId: personalLoan._id,
                loanDetails: {
                    loanType: 'Personal Loan',
                    principalAmount: 250000,
                    interestRate: '10.5%',
                    term: '36 months',
                },
            },
        ]);
        // Create transfer recipients
        const transferRecipients = await models.TransferRecipient.create([
            {
                userId: users[0]._id,
                name: 'Maria Santos',
                accountNumber: '5432167890',
                isFavorite: true,
            },
            {
                userId: users[0]._id,
                name: 'Ana Reyes',
                accountNumber: '2345678901',
                bankName: 'BDO',
                bankCode: 'BDO',
                isFavorite: true,
            },
        ]);
        // Create cards
        await models.Card.create({
            userId: users[0]._id,
            cardNumber: '4111111111111111', // Valid VISA test number
            maskedNumber: '•••• •••• •••• 1111',
            cardholderName: 'JOSH FERMANO',
            expiryMonth: '09',
            expiryYear: '25',
            cvv: '123',
            type: models.CardType.VISA,
            isDefault: true,
        });
        console.log('✅ Database seeded successfully');
    }
    catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
};
exports.seedDatabase = seedDatabase;
