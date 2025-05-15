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
exports.getCompanyPriceHistory = exports.deleteAlert = exports.updateAlert = exports.createAlert = exports.getAlerts = exports.getTransactionHistory = exports.getPerformance = exports.sellShares = exports.buyShares = exports.getInvestmentById = exports.getUserInvestments = exports.getCompanyById = exports.getAllCompanies = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importDefault(require("mongoose"));
const Investment_1 = require("../models/Investment");
const Transaction_1 = __importStar(require("../models/Transaction"));
const Account_1 = __importDefault(require("../models/Account"));
// Get all companies
const getAllCompanies = async (req, res) => {
    try {
        const companies = await Investment_1.Company.find({ isActive: true });
        // Ensure we have companies to display
        if (companies.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                data: { companies: [] },
                message: 'No companies found in database. Please seed the database first.',
            });
        }
        // Simulate market movement with a more realistic pattern
        const updatedCompanies = await Promise.all(companies.map(async (company) => {
            // Save previous price
            const previousPrice = company.currentPrice;
            // Generate more realistic market movement
            // Market movement tends to be smaller (0.5-1.5% daily change typically)
            const priceChange = (Math.random() - 0.5) * 0.02 * company.currentPrice;
            company.previousClose = previousPrice;
            company.currentPrice = parseFloat((previousPrice + priceChange).toFixed(2));
            company.change = parseFloat((company.currentPrice - company.previousClose).toFixed(2));
            company.changePercent = parseFloat(((company.change / company.previousClose) * 100).toFixed(2));
            await company.save();
            return company;
        }));
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: updatedCompanies.length,
            data: { companies: updatedCompanies },
        });
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch companies',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getAllCompanies = getAllCompanies;
// Get company by ID
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid company ID',
            });
        }
        const company = await Investment_1.Company.findById(id);
        if (!company) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Company not found',
            });
        }
        // Simulate price update with more realistic movement
        const previousPrice = company.currentPrice;
        const marketSentiment = Math.random(); // 0-0.3: bearish, 0.3-0.7: neutral, 0.7-1.0: bullish
        // Adjust volatility based on market sentiment
        let volatility = 0.01; // Base volatility of 1%
        if (marketSentiment < 0.3) {
            // Bearish - slightly higher volatility with downward bias
            const priceChange = -(Math.random() * 0.015 + 0.005) * company.currentPrice;
            company.currentPrice = parseFloat((previousPrice + priceChange).toFixed(2));
        }
        else if (marketSentiment > 0.7) {
            // Bullish - slightly higher volatility with upward bias
            const priceChange = (Math.random() * 0.015 + 0.005) * company.currentPrice;
            company.currentPrice = parseFloat((previousPrice + priceChange).toFixed(2));
        }
        else {
            // Neutral - normal volatility
            const priceChange = (Math.random() - 0.5) * 0.02 * company.currentPrice;
            company.currentPrice = parseFloat((previousPrice + priceChange).toFixed(2));
        }
        company.previousClose = previousPrice;
        company.change = parseFloat((company.currentPrice - company.previousClose).toFixed(2));
        company.changePercent = parseFloat(((company.change / company.previousClose) * 100).toFixed(2));
        await company.save();
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { company },
        });
    }
    catch (error) {
        console.error('Error fetching company:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch company',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getCompanyById = getCompanyById;
// Get user investments
const getUserInvestments = async (req, res) => {
    try {
        // Get userId from either _id or id property
        const userId = req.user?._id || req.user?.id;
        // Log request for debugging
        console.log('getUserInvestments request from user:', userId);
        // Check if user exists
        if (!userId) {
            console.error('User not authenticated - no userId found in request');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        console.log('Fetching investments for user:', userId);
        const investments = await Investment_1.Investment.find({
            userId,
            isActive: true,
        }).populate('companyId');
        console.log(`Found ${investments.length} investments for user:`, userId);
        if (investments.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                count: 0,
                data: {
                    investments: [],
                    totalValue: 0,
                    totalProfit: 0,
                    totalProfitPercent: 0,
                },
                message: 'No investments found for this user.',
            });
        }
        // Update investment values based on current company prices
        for (const investment of investments) {
            // Use type assertion to handle the method that's defined on the schema
            await investment.updateValues();
        }
        // Fetch updated investments with populated company data
        const updatedInvestments = await Investment_1.Investment.find({
            userId,
            isActive: true,
        }).populate('companyId');
        // Calculate portfolio totals
        let totalValue = 0;
        let totalInvested = 0;
        for (const inv of updatedInvestments) {
            totalValue += inv.currentValue;
            totalInvested += inv.amount;
        }
        const totalProfit = totalValue - totalInvested;
        const totalProfitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            count: updatedInvestments.length,
            data: {
                investments: updatedInvestments,
                totalValue,
                totalInvested,
                totalProfit,
                totalProfitPercent,
            },
        });
    }
    catch (error) {
        console.error('Error fetching investments:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch investments',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getUserInvestments = getUserInvestments;
// Get investment by ID
const getInvestmentById = async (req, res) => {
    try {
        const { id } = req.params;
        // Get userId from either _id or id property
        const userId = req.user?._id || req.user?.id;
        console.log(`getInvestmentById request for investment ${id} from user:`, userId);
        if (!userId) {
            console.error('User not authenticated - no userId found in request');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid investment ID',
            });
        }
        console.log(`Fetching investment ${id} for user ${userId}`);
        const investment = await Investment_1.Investment.findOne({ _id: id, userId }).populate('companyId');
        if (!investment) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Investment not found',
            });
        }
        // Update investment value
        await investment.updateValues();
        // Get the updated investment
        const updatedInvestment = await Investment_1.Investment.findOne({
            _id: id,
            userId,
        }).populate('companyId');
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { investment: updatedInvestment },
        });
    }
    catch (error) {
        console.error('Error fetching investment:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch investment',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getInvestmentById = getInvestmentById;
// Buy shares
const buyShares = async (req, res) => {
    try {
        // Get userId from either _id or id property
        const userId = req.user?._id || req.user?.id;
        const { companyId, shares, accountId } = req.body;
        console.log(`[buyShares] Request params - userId: ${userId}, companyId: ${companyId}, shares: ${shares}, accountId: ${accountId}`);
        if (!userId) {
            console.error('[buyShares] User not authenticated - no userId found in request');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!companyId || !shares) {
            console.error('[buyShares] Missing required fields', {
                companyId,
                shares,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Company ID and number of shares are required',
            });
        }
        // Validate ObjectIds correctly
        if (!mongoose_1.default.isValidObjectId(companyId)) {
            console.error('[buyShares] Invalid company ID:', companyId);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid company ID format',
            });
        }
        const sharesNum = Number(shares);
        if (isNaN(sharesNum) || sharesNum <= 0) {
            console.error('[buyShares] Invalid shares number:', shares);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Shares must be a positive number',
            });
        }
        // Find company
        const company = await Investment_1.Company.findById(companyId);
        console.log(`[buyShares] Company lookup result:`, company ? `Found ${company.name}` : 'Not found');
        if (!company) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Company not found',
            });
        }
        // Calculate cost
        const cost = parseFloat((sharesNum * company.currentPrice).toFixed(2));
        console.log(`[buyShares] Transaction cost: ${cost} for ${sharesNum} shares at ${company.currentPrice} per share`);
        let account;
        if (accountId === 'default') {
            console.log('[buyShares] Using default account - finding first account for user');
            account = await Account_1.default.findOne({ userId }).sort({ createdAt: 1 });
            if (!account) {
                console.error('[buyShares] No account found for user:', userId);
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No account found for this user',
                });
            }
            console.log(`[buyShares] Found default account: ${account._id}`);
        }
        else {
            // If accountId is provided, validate it's a valid ObjectId
            if (!mongoose_1.default.isValidObjectId(accountId)) {
                console.error('[buyShares] Invalid account ID format:', accountId);
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid account ID format',
                });
            }
            console.log(`[buyShares] Looking up specific account: ${accountId}`);
            account = await Account_1.default.findOne({ _id: accountId, userId });
            if (!account) {
                console.error(`[buyShares] Account not found with ID: ${accountId} for user: ${userId}`);
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Account not found or does not belong to this user',
                });
            }
        }
        // Check if user has sufficient balance
        console.log(`[buyShares] Account balance check: Balance ${account.balance}, Required ${cost}`);
        if (account.balance < cost) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Insufficient balance to complete this purchase. Required: ${formatCurrency(cost)}, Available: ${formatCurrency(account.balance)}`,
            });
        }
        // Deduct the amount from the account
        const previousBalance = account.balance;
        account.balance = parseFloat((account.balance - cost).toFixed(2));
        await account.save();
        console.log(`[buyShares] Updated account balance from ${previousBalance} to ${account.balance}`);
        // Check if user already has an investment for this company
        let investment = await Investment_1.Investment.findOne({ userId, companyId });
        console.log(`[buyShares] Existing investment check:`, investment ? 'Found existing investment' : 'No existing investment');
        if (investment) {
            const newTotalShares = investment.shares + sharesNum;
            const newTotalAmount = investment.amount + cost;
            investment.shares = newTotalShares;
            investment.amount = newTotalAmount;
            investment.purchasePrice = parseFloat((newTotalAmount / newTotalShares).toFixed(2));
            investment.currentValue = parseFloat((newTotalShares * company.currentPrice).toFixed(2));
            await investment.save();
            console.log(`[buyShares] Updated existing investment: ${investment._id}`);
        }
        else {
            investment = await Investment_1.Investment.create({
                userId,
                companyId,
                shares: sharesNum,
                amount: cost,
                purchaseDate: new Date(),
                purchasePrice: company.currentPrice,
                currentValue: cost,
            });
            console.log(`[buyShares] Created new investment: ${investment._id}`);
        }
        await investment.updateValues();
        const transactionId = await Transaction_1.default.generateTransactionId();
        const transaction = await Transaction_1.default.create({
            transactionId,
            type: Transaction_1.TransactionType.INVESTMENT,
            amount: cost,
            fee: 0,
            fromAccount: account._id,
            description: `Purchased ${sharesNum} shares of ${company.symbol} at ${formatCurrency(company.currentPrice)} per share. Investment ID: ${investment._id}`,
            status: Transaction_1.TransactionStatus.COMPLETED,
            merchantName: company.name,
            merchantLogo: company.logoUrl || '',
            merchantCategory: company.sector || 'Investments',
            date: new Date(),
            currency: '₱',
        });
        console.log(`[buyShares] Created transaction record: ${transaction._id}`);
        // Get the updated investment with company data
        const updatedInvestment = await Investment_1.Investment.findById(investment._id).populate('companyId');
        console.log(`[buyShares] Transaction completed successfully`);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            data: { investment: updatedInvestment },
        });
    }
    catch (error) {
        console.error('[buyShares] ERROR:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to buy shares',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.buyShares = buyShares;
// Helper function to format currency
const formatCurrency = (amount) => {
    return amount.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    });
};
// Sell shares
const sellShares = async (req, res) => {
    try {
        // Get userId from either _id or id property
        const userId = req.user?._id || req.user?.id;
        const { investmentId, shares, accountId } = req.body;
        console.log(`[sellShares] Request params - userId: ${userId}, investmentId: ${investmentId}, shares: ${shares}, accountId: ${accountId}`);
        if (!userId) {
            console.error('[sellShares] User not authenticated - no userId found in request');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!investmentId || !shares) {
            console.error('[sellShares] Missing required fields', {
                investmentId,
                shares,
            });
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Investment ID and number of shares are required',
            });
        }
        // Validate ObjectIds correctly
        if (!mongoose_1.default.isValidObjectId(investmentId)) {
            console.error('[sellShares] Invalid investment ID:', investmentId);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid investment ID format',
            });
        }
        const sharesNum = Number(shares);
        if (isNaN(sharesNum) || sharesNum <= 0) {
            console.error('[sellShares] Invalid shares number:', shares);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Shares must be a positive number',
            });
        }
        // Find the investment
        const investment = await Investment_1.Investment.findOne({
            _id: investmentId,
            userId,
        }).populate('companyId');
        console.log(`[sellShares] Investment lookup result:`, investment
            ? `Found investment for ${investment.companyId.name}`
            : 'Not found');
        if (!investment) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Investment not found',
            });
        }
        if (sharesNum > investment.shares) {
            console.error(`[sellShares] Insufficient shares: Requested ${sharesNum}, Available ${investment.shares}`);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `You cannot sell more shares than you own. Available: ${investment.shares}, Requested: ${sharesNum}`,
            });
        }
        const company = await Investment_1.Company.findById(investment.companyId);
        console.log(`[sellShares] Company lookup result:`, company ? `Found ${company.name}` : 'Not found');
        if (!company) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Company not found',
            });
        }
        // Calculate sale value
        const saleValue = parseFloat((sharesNum * company.currentPrice).toFixed(2));
        console.log(`[sellShares] Transaction value: ${saleValue} for ${sharesNum} shares at ${company.currentPrice} per share`);
        // Find account for the transaction
        let account;
        // Handle 'default' account case - find first available account
        if (accountId === 'default') {
            console.log('[sellShares] Using default account - finding first account for user');
            account = await Account_1.default.findOne({ userId }).sort({ createdAt: 1 });
            if (!account) {
                console.error('[sellShares] No account found for user:', userId);
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No account found for this user',
                });
            }
            console.log(`[sellShares] Found default account: ${account._id}`);
        }
        else {
            // If accountId is provided, validate it's a valid ObjectId
            if (!mongoose_1.default.isValidObjectId(accountId)) {
                console.error('[sellShares] Invalid account ID format:', accountId);
                return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid account ID format',
                });
            }
            console.log(`[sellShares] Looking up specific account: ${accountId}`);
            account = await Account_1.default.findOne({ _id: accountId, userId });
            if (!account) {
                console.error(`[sellShares] Account not found with ID: ${accountId} for user: ${userId}`);
                return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Account not found or does not belong to this user',
                });
            }
        }
        // Credit the account
        const previousBalance = account.balance;
        account.balance = parseFloat((account.balance + saleValue).toFixed(2));
        await account.save();
        console.log(`[sellShares] Updated account balance from ${previousBalance} to ${account.balance}`);
        // Create transaction record
        const transactionId = await Transaction_1.default.generateTransactionId();
        const transaction = await Transaction_1.default.create({
            transactionId,
            type: Transaction_1.TransactionType.INVESTMENT,
            amount: saleValue,
            fee: 0,
            toAccount: account._id,
            description: `Sold ${sharesNum} shares of ${company.symbol} at ${formatCurrency(company.currentPrice)} per share. Investment ID: ${investment._id}`,
            status: Transaction_1.TransactionStatus.COMPLETED,
            merchantName: company.name,
            merchantLogo: company.logoUrl || '',
            merchantCategory: company.sector || 'Investments',
            date: new Date(),
            currency: '₱',
        });
        console.log(`[sellShares] Created transaction record: ${transaction._id}`);
        if (sharesNum === investment.shares) {
            // Selling all shares
            investment.isActive = false;
            await investment.save();
            console.log(`[sellShares] Marked investment as inactive after selling all shares`);
            res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: 'Successfully sold all shares',
                data: { saleValue },
            });
        }
        else {
            // Selling partial shares
            const newShares = investment.shares - sharesNum;
            const proportionalCost = (sharesNum / investment.shares) * investment.amount;
            investment.shares = newShares;
            investment.amount = parseFloat((investment.amount - proportionalCost).toFixed(2));
            await investment.save();
            console.log(`[sellShares] Updated investment after partial sale: ${investment.shares} shares remaining`);
            // Update investment values
            await investment.updateValues();
            // Get the updated investment
            const updatedInvestment = await Investment_1.Investment.findById(investment._id).populate('companyId');
            res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                message: 'Successfully sold shares',
                data: { investment: updatedInvestment, saleValue },
            });
        }
        console.log(`[sellShares] Transaction completed successfully`);
    }
    catch (error) {
        console.error('[sellShares] ERROR:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to sell shares',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.sellShares = sellShares;
// Get investment performance (simulated)
const getPerformance = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { timeRange } = req.query;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Generate simulated performance data based on user investments
        const investments = await Investment_1.Investment.find({
            userId,
            isActive: true,
        }).populate('companyId');
        if (investments.length === 0) {
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                data: {
                    currentValue: 0,
                    performanceData: [],
                },
                message: 'No active investments found',
            });
        }
        // Calculate current portfolio value
        let portfolioValue = 0;
        for (const investment of investments) {
            await investment.updateValues();
            portfolioValue += investment.currentValue;
        }
        // Generate historical data points (simulated)
        const today = new Date();
        const dataPoints = [];
        // Number of days based on time range
        let days = 30; // Default to 1 month
        if (timeRange === '1W') {
            days = 7;
        }
        else if (timeRange === '1M') {
            days = 30;
        }
        else if (timeRange === '3M') {
            days = 90;
        }
        else if (timeRange === '1Y') {
            days = 365;
        }
        else if (timeRange === 'ALL') {
            days = 730; // 2 years
        }
        const startValue = portfolioValue * (1 - (Math.random() * 0.2 + 0.1)); // Start 10-30% lower
        // Create realistic market pattern with small daily variations and occasional larger moves
        let currentValue = startValue;
        for (let i = days; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            // Realistic daily movement - mostly small with occasional larger moves
            const marketMove = Math.random();
            let dailyChange;
            if (marketMove > 0.95) {
                // Occasional large positive move (5% chance)
                dailyChange = Math.random() * 0.02 + 0.01; // 1-3% up
            }
            else if (marketMove < 0.05) {
                // Occasional large negative move (5% chance)
                dailyChange = -(Math.random() * 0.02 + 0.01); // 1-3% down
            }
            else {
                // Normal daily move (90% chance)
                dailyChange = (Math.random() - 0.48) * 0.01; // -0.48% to +0.52% (slight upward bias)
            }
            // Apply the daily change
            currentValue = currentValue * (1 + dailyChange);
            // Ensure we end at the current portfolio value on the last day
            if (i === 0) {
                currentValue = portfolioValue;
            }
            dataPoints.push({
                date: date.toISOString().split('T')[0],
                value: parseFloat(currentValue.toFixed(2)),
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                currentValue: portfolioValue,
                performanceData: dataPoints,
            },
        });
    }
    catch (error) {
        console.error('Error getting performance data:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to get performance data',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getPerformance = getPerformance;
// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Find investment-related transactions for this user
        const transactions = await Transaction_1.default.find({
            $or: [
                {
                    fromAccount: { $in: await getAccountIds(userId) },
                    type: Transaction_1.TransactionType.INVESTMENT,
                },
                {
                    toAccount: { $in: await getAccountIds(userId) },
                    type: Transaction_1.TransactionType.INVESTMENT,
                },
            ],
        })
            .sort({ date: -1 }) // Sort by date, newest first
            .populate('fromAccount toAccount');
        // Format transactions for the frontend
        const formattedTransactions = await Promise.all(transactions.map(async (transaction) => {
            // Try to find the investment to get company details
            const investmentId = transaction.description.includes('Investment ID:')
                ? transaction.description.split('Investment ID:')[1].trim()
                : null;
            const investment = investmentId
                ? await Investment_1.Investment.findOne({ _id: investmentId }).populate('companyId')
                : null;
            // Determine transaction type based on description
            let transactionType = 'INVESTMENT';
            if (transaction.description.includes('Purchased')) {
                transactionType = 'BUY';
            }
            else if (transaction.description.includes('Sold')) {
                transactionType = 'SELL';
            }
            else if (transaction.description.includes('Dividend')) {
                transactionType = 'DIVIDEND';
            }
            // Extract shares count from description
            const sharesMatch = transaction.description.match(/(\d+) shares/);
            const sharesCount = sharesMatch ? parseInt(sharesMatch[1]) : 0;
            // Extract price per share
            const priceMatch = transaction.description.match(/at ₱([\d,]+\.\d+)/);
            const pricePerShare = priceMatch
                ? parseFloat(priceMatch[1].replace(/,/g, ''))
                : transaction.amount / sharesCount;
            return {
                _id: transaction._id,
                transactionId: transaction.transactionId,
                type: transactionType,
                companyId: investment?.companyId || null,
                shares: sharesCount,
                price: pricePerShare,
                amount: transaction.amount,
                date: transaction.date,
                status: transaction.status,
                userId,
                accountId: transaction.fromAccount?._id || transaction.toAccount?._id,
            };
        }));
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { transactions: formattedTransactions },
        });
    }
    catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch transaction history',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getTransactionHistory = getTransactionHistory;
// Helper function to get all account IDs for a user
const getAccountIds = async (userId) => {
    const accounts = await Account_1.default.find({ userId });
    return accounts.map((account) => account._id);
};
// Get all price alerts
const getAlerts = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const alerts = await Investment_1.PriceAlert.find({ userId })
            .populate('companyId')
            .sort({ createdAt: -1 });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { alerts },
        });
    }
    catch (error) {
        console.error('Error fetching price alerts:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch price alerts',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getAlerts = getAlerts;
// Create a price alert
const createAlert = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { companyId, type, value } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        // Validate input
        if (!companyId || !type || !value) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Company ID, alert type, and price value are required',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid company ID',
            });
        }
        // Validate the company exists
        const company = await Investment_1.Company.findById(companyId);
        if (!company) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Company not found',
            });
        }
        // Validate the price makes sense based on the alert type
        if (type === 'PRICE_ABOVE' && value <= company.currentPrice) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `The price should be above the current price (${company.currentPrice})`,
            });
        }
        if (type === 'PRICE_BELOW' && value >= company.currentPrice) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `The price should be below the current price (${company.currentPrice})`,
            });
        }
        // Create the alert
        const alert = await Investment_1.PriceAlert.create({
            userId,
            companyId,
            type,
            value,
            active: true,
            triggered: false,
        });
        // Populate company details before returning
        await alert.populate('companyId');
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            data: { alert },
        });
    }
    catch (error) {
        console.error('Error creating price alert:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to create price alert',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.createAlert = createAlert;
// Update a price alert
const updateAlert = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { active } = req.body;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid alert ID',
            });
        }
        // Find and update the alert
        const alert = await Investment_1.PriceAlert.findOneAndUpdate({ _id: id, userId }, { active: active }, { new: true } // Return the updated document
        ).populate('companyId');
        if (!alert) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Alert not found or does not belong to the user',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: { alert },
        });
    }
    catch (error) {
        console.error('Error updating price alert:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update price alert',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.updateAlert = updateAlert;
// Delete a price alert
const deleteAlert = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid alert ID',
            });
        }
        // Find and delete the alert
        const alert = await Investment_1.PriceAlert.findOneAndDelete({ _id: id, userId });
        if (!alert) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Alert not found or does not belong to the user',
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Alert deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting price alert:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to delete price alert',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.deleteAlert = deleteAlert;
// Get company price history
const getCompanyPriceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { timeRange } = req.query;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid company ID',
            });
        }
        const company = await Investment_1.Company.findById(id);
        if (!company) {
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Company not found',
            });
        }
        // Generate simulated price history
        const today = new Date();
        const priceHistory = [];
        // Number of days based on time range
        let days = 30; // Default to 1 month
        if (timeRange === '1D')
            days = 1;
        else if (timeRange === '1W')
            days = 7;
        else if (timeRange === '1M')
            days = 30;
        else if (timeRange === '3M')
            days = 90;
        else if (timeRange === '1Y')
            days = 365;
        else if (timeRange === 'ALL')
            days = 730; // 2 years
        const startPrice = company.currentPrice * (1 - (Math.random() * 0.2 + 0.1)); // Start 10-30% lower
        // Create realistic market pattern with small daily variations and occasional larger moves
        let currentPrice = startPrice;
        for (let i = days; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            // Realistic daily movement - mostly small with occasional larger moves
            const marketMove = Math.random();
            let dailyChange;
            if (marketMove > 0.95) {
                // Occasional large positive move (5% chance)
                dailyChange = Math.random() * 0.02 + 0.01; // 1-3% up
            }
            else if (marketMove < 0.05) {
                // Occasional large negative move (5% chance)
                dailyChange = -(Math.random() * 0.02 + 0.01); // 1-3% down
            }
            else {
                // Normal daily move (90% chance)
                dailyChange = (Math.random() - 0.48) * 0.01; // -0.48% to +0.52% (slight upward bias)
            }
            // Apply the daily change
            currentPrice = currentPrice * (1 + dailyChange);
            // Ensure we end at the current company price on the last day
            if (i === 0) {
                currentPrice = company.currentPrice;
            }
            priceHistory.push({
                date: date.toISOString().split('T')[0],
                price: parseFloat(currentPrice.toFixed(2)),
            });
        }
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                priceHistory,
            },
        });
    }
    catch (error) {
        console.error('Error getting company price history:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to get company price history',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getCompanyPriceHistory = getCompanyPriceHistory;
