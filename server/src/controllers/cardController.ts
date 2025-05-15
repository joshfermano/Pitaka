import { Request, Response } from 'express';
import Card, { CardType } from '../models/Card';
import { StatusCodes } from 'http-status-codes';

/**
 * Get all cards for a user
 * @route GET /api/cards
 * @access Private
 */
export const getUserCards = async (req: Request, res: Response) => {
  try {
    console.log('Getting cards for user:', req.user?.id);
    const userId = req.user?.id;

    const cards = await Card.find({ userId })
      .select('-cvv') // Never return CVV
      .sort({ createdAt: -1 }); // Most recent first

    console.log(`Found ${cards.length} cards for user ${userId}`);
    res.status(StatusCodes.OK).json({
      success: true,
      count: cards.length,
      data: { cards },
    });
  } catch (error: any) {
    console.error('Error fetching cards:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch cards',
      error: error.message,
    });
  }
};

/**
 * Get a specific card by ID
 * @route GET /api/cards/:id
 * @access Private
 */
export const getCardById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;

    console.log(`Getting card ${cardId} for user ${userId}`);

    const card = await Card.findOne({ _id: cardId, userId }).select('-cvv');

    if (!card) {
      console.log(`Card ${cardId} not found for user ${userId}`);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Card not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { card },
    });
  } catch (error: any) {
    console.error('Error fetching card:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch card',
      error: error.message,
    });
  }
};

/**
 * Add a new card
 * @route POST /api/cards
 * @access Private
 */
export const addCard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      cardNumber,
      cardholderName,
      expiryMonth,
      expiryYear,
      cvv,
      isDefault,
    } = req.body;

    console.log(`Adding new card for user ${userId} with data:`, {
      cardholderName,
      expiryMonth,
      expiryYear,
      isDefault,
      // Log masked values for sensitive fields
      cardNumber: cardNumber ? '****' + cardNumber.slice(-4) : 'undefined',
      cvv: cvv ? '***' : 'undefined',
    });

    // Check if required fields are present
    if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
      console.error('Missing required card information', {
        hasCardNumber: !!cardNumber,
        hasCardholderName: !!cardholderName,
        hasExpiryMonth: !!expiryMonth,
        hasExpiryYear: !!expiryYear,
        hasCvv: !!cvv,
      });

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide all required card information',
      });
    }

    // Validate month format (01-12)
    const monthNum = parseInt(expiryMonth, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid expiry month. Must be between 01-12',
      });
    }

    // Use the original expiryMonth value from the client
    // without additional formatting
    const preservedMonth = expiryMonth;

    // Validate year format (2-digit year)
    const yearNum = parseInt(expiryYear, 10);
    const currentYear = new Date().getFullYear() % 100;

    if (isNaN(yearNum) || yearNum < currentYear || yearNum > currentYear + 20) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Invalid expiry year. Must be between ${currentYear} and ${
          currentYear + 20
        }`,
      });
    }

    // Detect card type
    const cardType = Card.detectCardType(cardNumber);
    if (!cardType) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid or unsupported card type',
      });
    }

    // Validate CVV based on card type
    const cvvRegex = cardType === CardType.AMEX ? /^\d{4}$/ : /^\d{3}$/;
    if (!cvvRegex.test(cvv)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          cardType === CardType.AMEX
            ? 'AMEX cards require a 4-digit CVV'
            : 'CVV must be 3 digits',
      });
    }

    // If this card is default, unset default for other cards
    if (isDefault) {
      await Card.updateMany({ userId }, { isDefault: false });
    }

    // Create masked number
    const digits = cardNumber.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    const maskedNumber =
      cardType === CardType.AMEX
        ? `•••• •••••• ${last4}`
        : `•••• •••• •••• ${last4}`;

    // Create new card
    try {
      const cardData = {
        userId,
        cardNumber,
        maskedNumber,
        cardholderName,
        expiryMonth: preservedMonth, // Use the original month value
        expiryYear,
        cvv,
        type: cardType,
        isDefault: isDefault || false,
      };

      console.log('Attempting to create card with data:', {
        userId,
        cardholderName,
        expiryMonth: preservedMonth,
        expiryYear,
        type: cardType,
        isDefault: isDefault || false,
        // Log masked values for sensitive fields
        maskedNumber,
        cardNumber: '****' + cardNumber.slice(-4),
        cvv: cvv
          ? `${'*'.repeat(cvv.length - 1)}${cvv.slice(-1)}`
          : 'undefined',
        cvvLength: cvv ? cvv.length : 0,
      });

      const card = await Card.create(cardData);

      // Don't return sensitive data
      const sanitizedCard = await Card.findById(card._id).select(
        '-cvv -cardNumber'
      );

      console.log(`Card added successfully for user ${userId}`);
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Card added successfully',
        data: { card: sanitizedCard },
      });
    } catch (validationError: any) {
      console.error('Validation error during card creation:', validationError);

      if (validationError.name === 'ValidationError') {
        console.error(
          'Card validation errors details:',
          JSON.stringify(validationError.errors, null, 2)
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Card validation failed',
          error: validationError.message,
          details: Object.keys(validationError.errors || {}).reduce(
            (acc, field) => {
              acc[field] = validationError.errors[field].message;
              return acc;
            },
            {} as Record<string, string>
          ),
        });
      }

      throw validationError; // Re-throw for the outer catch
    }
  } catch (error: any) {
    console.error('Error adding card:', error);

    // Check for validation errors
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'This card is already registered',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to add card',
      error: error.message,
    });
  }
};

/**
 * Update a card
 * @route PUT /api/cards/:id
 * @access Private
 */
export const updateCard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;
    const { cardholderName, expiryMonth, expiryYear, isDefault, isActive } =
      req.body;

    console.log(`Updating card ${cardId} for user ${userId}`);

    // Find card
    const card = await Card.findOne({ _id: cardId, userId });

    if (!card) {
      console.log(`Card ${cardId} not found for user ${userId}`);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Card not found',
      });
    }

    // If setting this card as default, unset other cards
    if (isDefault && !card.isDefault) {
      await Card.updateMany(
        { userId, _id: { $ne: cardId } },
        { isDefault: false }
      );
    }

    // Update fields
    if (cardholderName) card.cardholderName = cardholderName;
    if (expiryMonth) card.expiryMonth = expiryMonth;
    if (expiryYear) card.expiryYear = expiryYear;
    if (typeof isDefault !== 'undefined') card.isDefault = isDefault;
    if (typeof isActive !== 'undefined') card.isActive = isActive;

    await card.save();

    // Return updated card without sensitive data
    const updatedCard = await Card.findById(cardId).select('-cvv');

    console.log(`Card ${cardId} updated successfully`);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Card updated successfully',
      data: { card: updatedCard },
    });
  } catch (error: any) {
    console.error('Error updating card:', error);
    // Check for validation errors
    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Validation error',
        error: error.message,
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update card',
      error: error.message,
    });
  }
};

/**
 * Delete a card
 * @route DELETE /api/cards/:id
 * @access Private
 */
export const deleteCard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;

    console.log(`Deleting card ${cardId} for user ${userId}`);

    // Find and delete card
    const card = await Card.findOneAndDelete({ _id: cardId, userId });

    if (!card) {
      console.log(`Card ${cardId} not found for user ${userId}`);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Card not found',
      });
    }

    // If the deleted card was default, set another card as default
    if (card.isDefault) {
      const anotherCard = await Card.findOne({ userId }).sort({
        createdAt: -1,
      });
      if (anotherCard) {
        anotherCard.isDefault = true;
        await anotherCard.save();
      }
    }

    console.log(`Card ${cardId} deleted successfully`);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting card:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to delete card',
      error: error.message,
    });
  }
};

/**
 * Get a specific card by ID with full card number (for authorized operations)
 * @route GET /api/cards/:id/fulldetails
 * @access Private
 */
export const getCardWithFullDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const cardId = req.params.id;

    console.log(
      `Getting full card details for card ${cardId} (user ${userId})`
    );

    // Additional security checks could be implemented here
    // For example: require re-authentication, check device trust, etc.

    const card = await Card.findOne({ _id: cardId, userId });

    if (!card) {
      console.log(`Card ${cardId} not found for user ${userId}`);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Format card number with spaces for readability
    let formattedCardNumber = '';
    const digits = card.cardNumber.replace(/\D/g, '');

    if (card.type === CardType.AMEX) {
      formattedCardNumber = [
        digits.substring(0, 4),
        digits.substring(4, 10),
        digits.substring(10),
      ].join(' ');
    } else {
      formattedCardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    const secureResponse = {
      _id: card._id,
      cardNumber: formattedCardNumber,
      maskedNumber: card.maskedNumber,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      type: card.type,
    };

    // Log the access for security auditing
    console.log(
      `Full card details retrieved for card ${cardId} by user ${userId}`
    );

    res.status(StatusCodes.OK).json({
      success: true,
      data: { card: secureResponse },
    });
  } catch (error: any) {
    console.error('Error fetching full card details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch card details',
      error: error.message,
    });
  }
};
