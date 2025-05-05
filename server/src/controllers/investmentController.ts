import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { Company, Investment, IInvestment } from '../models/Investment';

// Type extension for request with user
interface AuthRequest extends Request {
  user?: any;
}

// Get all companies
export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await Company.find({ isActive: true });

    const updatedCompanies = await Promise.all(
      companies.map(async (company) => {
        const priceChange = (Math.random() - 0.5) * 0.05 * company.currentPrice; // +/- 5% random change
        company.previousClose = company.currentPrice;
        company.currentPrice = parseFloat(
          (company.currentPrice + priceChange).toFixed(2)
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

    // Simulate price update
    const priceChange = (Math.random() - 0.5) * 0.02 * company.currentPrice; // +/- 2% random change
    company.previousClose = company.currentPrice;
    company.currentPrice = parseFloat(
      (company.currentPrice + priceChange).toFixed(2)
    );
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
    });
  }
};

// Get user investments
export const getUserInvestments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const investments = await Investment.find({
      userId,
      isActive: true,
    }).populate('companyId');

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

    res.status(StatusCodes.OK).json({
      success: true,
      count: updatedInvestments.length,
      data: { investments: updatedInvestments },
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch investments',
    });
  }
};

// Get investment by ID
export const getInvestmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid investment ID',
      });
    }

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
    });
  }
};

// Buy shares
export const buyShares = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { companyId, shares, accountId } = req.body;

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

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Calculate cost
    const cost = parseFloat((shares * company.currentPrice).toFixed(2));

    // Check if user already has an investment for this company
    let investment = await Investment.findOne({ userId, companyId });

    if (investment) {
      // Update existing investment
      const newTotalShares = investment.shares + shares;
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
        shares,
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
    });
  }
};

// Sell shares
export const sellShares = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { investmentId, shares, accountId } = req.body;

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

    if (shares > investment.shares) {
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
    const saleValue = parseFloat((shares * company.currentPrice).toFixed(2));

    // Credit the account (implementation omitted for simulation)
    // In a real implementation, add amount to user's account

    if (shares === investment.shares) {
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
      const newShares = investment.shares - shares;
      const proportionalCost = (shares / investment.shares) * investment.amount;

      investment.shares = newShares;
      investment.amount = investment.amount - proportionalCost;
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
    });
  }
};

// Get investment performance (simulated)
export const getPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { timeRange } = req.query;

    // Generate simulated performance data based on user investments
    const investments = await Investment.find({
      userId,
      isActive: true,
    }).populate('companyId');

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

    // Generate data points with some randomness but a general upward trend
    const startValue = portfolioValue * 0.7; // Start at 70% of current value
    const increment = (portfolioValue - startValue) / days;

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Base value plus some randomness
      const randomFactor = 1 + (Math.random() - 0.5) * 0.03; // +/- 1.5%
      const value = (startValue + increment * (days - i)) * randomFactor;

      dataPoints.push({
        date: date.toISOString().split('T')[0],
        value: parseFloat(value.toFixed(2)),
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
    });
  }
};
