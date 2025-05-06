import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import {
  Company,
  Investment,
  IInvestment,
  PriceAlert,
} from '../models/Investment';
import Transaction, { TransactionType } from '../models/Transaction';

// Type extension for request with user
interface AuthRequest extends Request {
  user?: any;
}

// Get all companies
export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await Company.find({ isActive: true });

    // Ensure we have companies to display
    if (companies.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        count: 0,
        data: { companies: [] },
        message:
          'No companies found in database. Please seed the database first.',
      });
    }

    // Simulate market movement with a more realistic pattern
    const updatedCompanies = await Promise.all(
      companies.map(async (company) => {
        // Save previous price
        const previousPrice = company.currentPrice;

        // Generate more realistic market movement
        // Market movement tends to be smaller (0.5-1.5% daily change typically)
        const priceChange = (Math.random() - 0.5) * 0.02 * company.currentPrice;

        company.previousClose = previousPrice;
        company.currentPrice = parseFloat(
          (previousPrice + priceChange).toFixed(2)
        );
        company.change = parseFloat(
          (company.currentPrice - company.previousClose).toFixed(2)
        );
        company.changePercent = parseFloat(
          ((company.change / company.previousClose) * 100).toFixed(2)
        );

        await company.save();
        return company;
      })
    );

    res.status(StatusCodes.OK).json({
      success: true,
      count: updatedCompanies.length,
      data: { companies: updatedCompanies },
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get company by ID
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const company = await Company.findById(id);

    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).json({
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
      const priceChange =
        -(Math.random() * 0.015 + 0.005) * company.currentPrice;
      company.currentPrice = parseFloat(
        (previousPrice + priceChange).toFixed(2)
      );
    } else if (marketSentiment > 0.7) {
      // Bullish - slightly higher volatility with upward bias
      const priceChange =
        (Math.random() * 0.015 + 0.005) * company.currentPrice;
      company.currentPrice = parseFloat(
        (previousPrice + priceChange).toFixed(2)
      );
    } else {
      // Neutral - normal volatility
      const priceChange = (Math.random() - 0.5) * 0.02 * company.currentPrice;
      company.currentPrice = parseFloat(
        (previousPrice + priceChange).toFixed(2)
      );
    }

    company.previousClose = previousPrice;
    company.change = parseFloat(
      (company.currentPrice - company.previousClose).toFixed(2)
    );
    company.changePercent = parseFloat(
      ((company.change / company.previousClose) * 100).toFixed(2)
    );

    await company.save();

    res.status(StatusCodes.OK).json({
      success: true,
      data: { company },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch company',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get user investments
export const getUserInvestments = async (req: AuthRequest, res: Response) => {
  try {
    // Get userId from either _id or id property
    const userId = req.user?._id || req.user?.id;

    // Log request for debugging
    console.log('getUserInvestments request from user:', userId);

    // Check if user exists
    if (!userId) {
      console.error('User not authenticated - no userId found in request');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    console.log('Fetching investments for user:', userId);

    const investments = await Investment.find({
      userId,
      isActive: true,
    }).populate('companyId');

    console.log(`Found ${investments.length} investments for user:`, userId);

    if (investments.length === 0) {
      return res.status(StatusCodes.OK).json({
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
      await (investment as any).updateValues();
    }

    // Fetch updated investments with populated company data
    const updatedInvestments = await Investment.find({
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
    const totalProfitPercent =
      totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    res.status(StatusCodes.OK).json({
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
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch investments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get investment by ID
export const getInvestmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Get userId from either _id or id property
    const userId = req.user?._id || req.user?.id;

    console.log(
      `getInvestmentById request for investment ${id} from user:`,
      userId
    );

    if (!userId) {
      console.error('User not authenticated - no userId found in request');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid investment ID',
      });
    }

    console.log(`Fetching investment ${id} for user ${userId}`);

    const investment = await Investment.findOne({ _id: id, userId }).populate(
      'companyId'
    );

    if (!investment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Investment not found',
      });
    }

    // Update investment value
    await (investment as any).updateValues();

    // Get the updated investment
    const updatedInvestment = await Investment.findOne({
      _id: id,
      userId,
    }).populate('companyId');

    res.status(StatusCodes.OK).json({
      success: true,
      data: { investment: updatedInvestment },
    });
  } catch (error) {
    console.error('Error fetching investment:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch investment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Buy shares
export const buyShares = async (req: AuthRequest, res: Response) => {
  try {
    // Get userId from either _id or id property
    const userId = req.user?._id || req.user?.id;
    const { companyId, shares, accountId } = req.body;

    console.log(
      `buyShares request from user ${userId} for company ${companyId}, ${shares} shares`
    );

    if (!userId) {
      console.error('User not authenticated - no userId found in request');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate input
    if (!companyId || !shares || !accountId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Company ID, number of shares, and account ID are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    const sharesNum = Number(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Shares must be a positive number',
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Calculate cost
    const cost = parseFloat((sharesNum * company.currentPrice).toFixed(2));

    // Check if user already has an investment for this company
    let investment = await Investment.findOne({ userId, companyId });

    if (investment) {
      // Update existing investment
      const newTotalShares = investment.shares + sharesNum;
      const newTotalAmount = investment.amount + cost;

      investment.shares = newTotalShares;
      investment.amount = newTotalAmount;
      investment.purchasePrice = parseFloat(
        (newTotalAmount / newTotalShares).toFixed(2)
      );
      investment.currentValue = parseFloat(
        (newTotalShares * company.currentPrice).toFixed(2)
      );

      await investment.save();
    } else {
      // Create new investment
      investment = await Investment.create({
        userId,
        companyId,
        shares: sharesNum,
        amount: cost,
        purchaseDate: new Date(),
        purchasePrice: company.currentPrice,
        currentValue: cost,
      });
    }

    // Update investment values
    await (investment as any).updateValues();

    // Get the updated investment with company data
    const updatedInvestment = await Investment.findById(
      investment._id
    ).populate('companyId');

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: { investment: updatedInvestment },
    });
  } catch (error) {
    console.error('Error buying shares:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to buy shares',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Sell shares
export const sellShares = async (req: AuthRequest, res: Response) => {
  try {
    // Get userId from either _id or id property
    const userId = req.user?._id || req.user?.id;
    const { investmentId, shares, accountId } = req.body;

    console.log(
      `sellShares request from user ${userId} for investment ${investmentId}, ${shares} shares`
    );

    if (!userId) {
      console.error('User not authenticated - no userId found in request');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate input
    if (!investmentId || !shares || !accountId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Investment ID, number of shares, and account ID are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(investmentId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid investment ID',
      });
    }

    const sharesNum = Number(shares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Shares must be a positive number',
      });
    }

    const investment = await Investment.findOne({
      _id: investmentId,
      userId,
    }).populate('companyId');

    if (!investment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Investment not found',
      });
    }

    if (sharesNum > investment.shares) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'You cannot sell more shares than you own',
      });
    }

    const company = await Company.findById(investment.companyId);

    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Calculate sale value
    const saleValue = parseFloat((sharesNum * company.currentPrice).toFixed(2));

    // Credit the account (implementation omitted for simulation)
    // In a real implementation, add amount to user's account

    if (sharesNum === investment.shares) {
      // Selling all shares
      investment.isActive = false;
      await investment.save();

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Successfully sold all shares',
        data: { saleValue },
      });
    } else {
      // Selling partial shares
      const newShares = investment.shares - sharesNum;
      const proportionalCost =
        (sharesNum / investment.shares) * investment.amount;

      investment.shares = newShares;
      investment.amount = parseFloat(
        (investment.amount - proportionalCost).toFixed(2)
      );
      await investment.save();

      // Update investment values
      await (investment as any).updateValues();

      // Get the updated investment
      const updatedInvestment = await Investment.findById(
        investment._id
      ).populate('companyId');

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Successfully sold shares',
        data: { investment: updatedInvestment, saleValue },
      });
    }
  } catch (error) {
    console.error('Error selling shares:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to sell shares',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get investment performance (simulated)
export const getPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { timeRange } = req.query;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Generate simulated performance data based on user investments
    const investments = await Investment.find({
      userId,
      isActive: true,
    }).populate('companyId');

    if (investments.length === 0) {
      return res.status(StatusCodes.OK).json({
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
      await (investment as any).updateValues();
      portfolioValue += investment.currentValue;
    }

    // Generate historical data points (simulated)
    const today = new Date();
    const dataPoints = [];

    // Number of days based on time range
    let days = 30; // Default to 1 month

    if (timeRange === '1W') {
      days = 7;
    } else if (timeRange === '1M') {
      days = 30;
    } else if (timeRange === '3M') {
      days = 90;
    } else if (timeRange === '1Y') {
      days = 365;
    } else if (timeRange === 'ALL') {
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
      } else if (marketMove < 0.05) {
        // Occasional large negative move (5% chance)
        dailyChange = -(Math.random() * 0.02 + 0.01); // 1-3% down
      } else {
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

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        currentValue: portfolioValue,
        performanceData: dataPoints,
      },
    });
  } catch (error) {
    console.error('Error getting performance data:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to get performance data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get transaction history
export const getTransactionHistory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Find investment-related transactions for this user
    const transactions = await Transaction.find({
      $or: [
        { 'fromAccount.userId': userId, type: TransactionType.INVESTMENT },
        { 'toAccount.userId': userId, type: TransactionType.INVESTMENT },
      ],
    })
      .sort({ date: -1 }) // Sort by date, newest first
      .populate('fromAccount toAccount');

    // Format transactions for the frontend
    const formattedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        // Try to find the investment to get company details
        const investment = await Investment.findOne({
          userId,
          _id: transaction.description.includes('Investment ID:')
            ? transaction.description.split('Investment ID:')[1].trim()
            : null,
        }).populate('companyId');

        return {
          _id: transaction._id,
          transactionId: transaction.transactionId,
          type: transaction.description.includes('Purchased')
            ? 'BUY'
            : transaction.description.includes('Sold')
            ? 'SELL'
            : transaction.description.includes('Dividend')
            ? 'DIVIDEND'
            : 'INVESTMENT',
          companyId: investment?.companyId || null,
          shares: transaction.description.includes('shares')
            ? parseFloat(
                transaction.description.split(' shares')[0].split(' ').pop() ||
                  '0'
              )
            : 0,
          price:
            transaction.amount /
            parseFloat(
              transaction.description.split(' shares')[0].split(' ').pop() ||
                '1'
            ),
          amount: transaction.amount,
          date: transaction.date,
          status: transaction.status,
          userId,
          accountId: transaction.fromAccount?._id || transaction.toAccount?._id,
        };
      })
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: { transactions: formattedTransactions },
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all price alerts
export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const alerts = await PriceAlert.find({ userId })
      .populate('companyId')
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      data: { alerts },
    });
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch price alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Create a price alert
export const createAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { companyId, type, value } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate input
    if (!companyId || !type || !value) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Company ID, alert type, and price value are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid company ID',
      });
    }

    // Validate the company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Validate the price makes sense based on the alert type
    if (type === 'PRICE_ABOVE' && value <= company.currentPrice) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `The price should be above the current price (${company.currentPrice})`,
      });
    }

    if (type === 'PRICE_BELOW' && value >= company.currentPrice) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `The price should be below the current price (${company.currentPrice})`,
      });
    }

    // Create the alert
    const alert = await PriceAlert.create({
      userId,
      companyId,
      type,
      value,
      active: true,
      triggered: false,
    });

    // Populate company details before returning
    await alert.populate('companyId');

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: { alert },
    });
  } catch (error) {
    console.error('Error creating price alert:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to create price alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update a price alert
export const updateAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { active } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid alert ID',
      });
    }

    // Find and update the alert
    const alert = await PriceAlert.findOneAndUpdate(
      { _id: id, userId },
      { active: active },
      { new: true } // Return the updated document
    ).populate('companyId');

    if (!alert) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Alert not found or does not belong to the user',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { alert },
    });
  } catch (error) {
    console.error('Error updating price alert:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update price alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Delete a price alert
export const deleteAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid alert ID',
      });
    }

    // Find and delete the alert
    const alert = await PriceAlert.findOneAndDelete({ _id: id, userId });

    if (!alert) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Alert not found or does not belong to the user',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete price alert',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
