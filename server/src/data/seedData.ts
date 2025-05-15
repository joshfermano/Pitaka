import mongoose from 'mongoose';
import * as models from '../models';

/**
 * Seed the database with initial data for Companies, LoanProducts, Banks, and Billers
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    console.log(
      '🌱 Starting focused seeding for Companies, LoanProducts, Banks, and Billers...'
    );

    // Check if data already exists
    const companyCount = await models.Company.countDocuments();
    const loanProductCount = await models.LoanProduct.countDocuments();
    const bankCount = await models.Bank.countDocuments();
    const billerCount = await models.Biller.countDocuments();

    if (
      companyCount > 0 &&
      loanProductCount > 0 &&
      bankCount > 0 &&
      billerCount > 0
    ) {
      console.log(
        'Database already contains seed data. Skipping seeding process.'
      );
      return;
    }

    // Create companies for investments
    if (companyCount === 0) {
      const companies = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'PLDT Inc.',
          symbol: 'TEL',
          currentPrice: 1250.5,
          previousClose: 1230.0,
          change: 20.5,
          changePercent: 1.67,
          sector: 'Telecommunications',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Ayala Corporation',
          symbol: 'AC',
          currentPrice: 752.0,
          previousClose: 755.0,
          change: -3.0,
          changePercent: -0.4,
          sector: 'Holding Firms',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'SM Investments',
          symbol: 'SM',
          currentPrice: 925.0,
          previousClose: 915.0,
          change: 10.0,
          changePercent: 1.09,
          sector: 'Holding Firms',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'BDO Unibank',
          symbol: 'BDO',
          currentPrice: 135.2,
          previousClose: 133.8,
          change: 1.4,
          changePercent: 1.05,
          sector: 'Financials',
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Jollibee Foods',
          symbol: 'JFC',
          currentPrice: 186.5,
          previousClose: 184.8,
          change: 1.7,
          changePercent: 0.92,
          sector: 'Consumer Services',
        },
      ];

      await models.Company.create(companies);
      console.log('✅ Companies seeded successfully');
    }

    // Create loan products
    if (loanProductCount === 0) {
      const loanProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Personal Loan',
          interest: '10.5% p.a.',
          minAmount: 10000,
          maxAmount: 500000,
          term: '6-36 months',
          icon: 'account',
          color: '#4F46E5',
          description:
            'Get the funds you need for personal expenses, debt consolidation, home improvements, or any other financial needs with our flexible personal loan options.',
          requirements: [
            'Must be 21-65 years old',
            'Minimum monthly income of ₱15,000',
            'Must be a Filipino citizen or resident foreigner',
            'At least 6 months with current employer',
          ],
          features: [
            {
              title: 'Flexible Terms',
              description:
                'Choose repayment terms that fit your budget, from 6 to 36 months.',
            },
            {
              title: 'Competitive Rates',
              description:
                'Our competitive interest rates start at 10.5% per annum.',
            },
            {
              title: 'Quick Approval',
              description:
                'Get a decision within 24-48 hours after complete submission.',
            },
            {
              title: 'No Collateral Required',
              description:
                "Unsecured loan option that doesn't require any collateral.",
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
            'Proof of billing (utility bill under your name)',
          ],
          faq: [
            {
              question: 'How much can I borrow?',
              answer:
                'You can borrow between ₱10,000 to ₱500,000 depending on your income and credit assessment.',
            },
            {
              question: 'How long does the approval process take?',
              answer:
                'Upon complete submission of requirements, the approval process typically takes 24-48 hours.',
            },
            {
              question: 'Are there any pre-payment penalties?',
              answer:
                'We allow early repayment with minimal fees. A fee of 5% of the remaining principal balance will apply.',
            },
          ],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Home Loan',
          interest: '5.75% p.a.',
          minAmount: 500000,
          maxAmount: 10000000,
          term: '5-30 years',
          icon: 'home-variant',
          color: '#059669',
          description:
            "Make your dream home a reality with our competitive home loan options. Whether you're buying your first home, refinancing, or investing in property, we have solutions tailored to your needs.",
          requirements: [
            'Must be 21-65 years old',
            'Minimum monthly income of ₱30,000',
            'Must be a Filipino citizen or resident foreigner',
            'Property must be in the Philippines',
          ],
          features: [
            {
              title: 'Long-term Financing',
              description:
                'Flexible terms from 5 to 30 years to fit your financial situation.',
            },
            {
              title: 'Low Interest Rates',
              description:
                'Competitive interest rates starting from 5.75% per annum.',
            },
            {
              title: 'High Loan Amount',
              description:
                'Borrow up to ₱10,000,000 depending on property value and income.',
            },
            {
              title: 'Multiple Property Types',
              description:
                'Finance single-family homes, condominiums, townhouses, and more.',
            },
          ],
          eligibility: [
            'Filipino citizen or resident foreigner',
            'Age 21-65 years old',
            'Regular employment with at least 2 years tenure',
            'Minimum monthly income of ₱30,000',
            'Good credit history',
          ],
          documents: [
            'Valid government-issued ID',
            'Proof of income (latest 3 months pay slips)',
            'Income tax returns for the past 2 years',
            'Certificate of Employment',
            'Latest 6 months bank statements',
            'Property documents (title, tax declaration, etc.)',
          ],
          faq: [
            {
              question: 'What is the loan-to-value ratio?',
              answer:
                'We offer up to 80% financing of the appraised property value.',
            },
            {
              question:
                'Can I apply for a home loan for a property under construction?',
              answer:
                'Yes, we offer construction loans with progressive release of funds based on construction milestones.',
            },
          ],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Auto Loan',
          interest: '7.25% p.a.',
          minAmount: 100000,
          maxAmount: 1000000,
          term: '12-60 months',
          icon: 'car',
          color: '#059669',
          description:
            'Finance your dream car with our competitive auto loan options. Get on the road faster with quick approval and flexible terms.',
          requirements: [
            'Must be 21-65 years old',
            'Minimum monthly income of ₱25,000',
            'Must be a Filipino citizen or resident foreigner',
            'At least 1 year with current employer',
          ],
          features: [
            {
              title: 'Low Interest Rates',
              description:
                'Competitive interest rates starting from 7.25% per annum.',
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
              answer:
                'You can finance new or used vehicles up to 7 years old from authorized dealers.',
            },
            {
              question: 'What is the minimum down payment?',
              answer: 'The minimum down payment is 20% of the vehicle price.',
            },
          ],
        },
      ];

      await models.LoanProduct.create(loanProducts);
      console.log('✅ Loan Products seeded successfully');
    }

    if (bankCount === 0) {
      const banks = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Banco De Oro (BDO)',
          code: 'BDO',
          logo: 'bdo',
          country: 'Philippines',
          swiftCode: 'BNORPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Bank of the Philippine Islands (BPI)',
          code: 'BPI',
          logo: 'bpi',
          country: 'Philippines',
          swiftCode: 'BOPIPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Metrobank',
          code: 'MBTC',
          logo: 'metrobank',
          country: 'Philippines',
          swiftCode: 'MBTCPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'UnionBank',
          code: 'UBP',
          logo: 'unionbank',
          country: 'Philippines',
          swiftCode: 'UBPHPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Security Bank',
          code: 'SECB',
          logo: 'securitybank',
          country: 'Philippines',
          swiftCode: 'SETCPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Philippine National Bank (PNB)',
          code: 'PNB',
          logo: 'pnb',
          country: 'Philippines',
          swiftCode: 'PNBMPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Landbank of the Philippines',
          code: 'LBP',
          logo: 'landbank',
          country: 'Philippines',
          swiftCode: 'TLBPPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Rizal Commercial Banking Corporation (RCBC)',
          code: 'RCBC',
          logo: 'rcbc',
          country: 'Philippines',
          swiftCode: 'RCBCPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Eastwest Bank',
          code: 'EWB',
          logo: 'eastwest',
          country: 'Philippines',
          swiftCode: 'EWBCPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'China Banking Corporation (Chinabank)',
          code: 'CBC',
          logo: 'chinabank',
          country: 'Philippines',
          swiftCode: 'CHBKPHMM',
          transferFees: {
            domestic: 25,
            international: 250,
          },
        },
      ];

      await models.Bank.create(banks);
      console.log('✅ Banks seeded successfully');
    }

    // Create billers
    if (billerCount === 0) {
      const billers = [
        {
          _id: new mongoose.Types.ObjectId(),
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
          _id: new mongoose.Types.ObjectId(),
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
          _id: new mongoose.Types.ObjectId(),
          name: 'Manila Water',
          category: models.BillerCategory.WATER,
          logo: 'manilaWater',
          accountNumberLabel: 'Contract Account Number',
          accountNumberMask: '##########',
          accountNumberLength: 10,
          minimumAmount: 50,
          maximumAmount: 30000,
          popularIndex: 3,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Netflix',
          category: models.BillerCategory.ENTERTAINMENT,
          logo: 'netflix',
          accountNumberLabel: 'Email Address',
          minimumAmount: 149,
          maximumAmount: 549,
          popularIndex: 4,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Spotify',
          category: models.BillerCategory.ENTERTAINMENT,
          logo: 'spotify',
          accountNumberLabel: 'Email Address',
          minimumAmount: 129,
          maximumAmount: 194,
          popularIndex: 5,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Apple',
          category: models.BillerCategory.ENTERTAINMENT,
          logo: 'apple',
          accountNumberLabel: 'Apple ID',
          minimumAmount: 50,
          maximumAmount: 10000,
          popularIndex: 6,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Goodhands Insurance',
          category: models.BillerCategory.INSURANCE,
          logo: 'goodhands',
          accountNumberLabel: 'Policy Number',
          accountNumberMask: 'GH-########',
          accountNumberLength: 10,
          minimumAmount: 500,
          maximumAmount: 50000,
          popularIndex: 7,
        },
      ];

      await models.Biller.create(billers);
      console.log('✅ Billers seeded successfully');
    }

    console.log('✅ Focused database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};
