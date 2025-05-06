import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { User, Account } from '../models';

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get the user's main account to include account number
    const mainAccount = await Account.findOne({
      userId,
      type: 'MAIN',
    }).select('accountNumber name balance type');

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user,
        mainAccount: mainAccount
          ? {
              id: mainAccount._id,
              accountNumber: mainAccount.accountNumber,
              name: mainAccount.name,
              balance: mainAccount.balance,
              type: mainAccount.type,
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, phoneNumber, address } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    if (address) {
      user.address = {
        ...user.address,
        ...address,
      };
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(userId).select('-password');

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update user profile',
      error: error.message,
    });
  }
};

/**
 * Get user settings
 * @route GET /api/users/settings
 * @access Private
 */
export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await User.findById(userId).select('settings');

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // If user has no settings yet, return default settings
    const settings = user.settings || {
      notificationsEnabled: true,
      darkModeEnabled: false,
      biometricsEnabled: false,
      language: 'en',
    };

    res.status(StatusCodes.OK).json({
      success: true,
      data: { settings },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user settings',
      error: error.message,
    });
  }
};

/**
 * Update user settings
 * @route PUT /api/users/settings
 * @access Private
 */
export const updateUserSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      notificationsEnabled,
      darkModeEnabled,
      biometricsEnabled,
      language,
    } = req.body;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    // Initialize settings object if it doesn't exist
    if (!user.settings) {
      user.settings = {
        notificationsEnabled: true,
        darkModeEnabled: false,
        biometricsEnabled: false,
        language: 'en',
      };
    }

    // Update settings
    if (notificationsEnabled !== undefined)
      user.settings.notificationsEnabled = notificationsEnabled;
    if (darkModeEnabled !== undefined)
      user.settings.darkModeEnabled = darkModeEnabled;
    if (biometricsEnabled !== undefined)
      user.settings.biometricsEnabled = biometricsEnabled;
    if (language) user.settings.language = language;

    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: user.settings },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update user settings',
      error: error.message,
    });
  }
};

/**
 * Search for users by username or name for transfer
 * @route GET /api/users/search
 * @access Private
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { query } = req.query;

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!query || typeof query !== 'string') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Search for users with matching username, firstName, or lastName
    // Exclude the current user from results
    const users = await User.find({
      $and: [
        { _id: { $ne: userId } }, // Not the current user
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
          ],
        },
      ],
    })
      .select('_id username firstName lastName') // Only return necessary fields
      .limit(10);

    res.status(StatusCodes.OK).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to search users',
      error: error.message,
    });
  }
};

/**
 * Get a specific user by ID (for transfer verification)
 * @route GET /api/users/:id
 * @access Private
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const { id } = req.params;

    if (!currentUserId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    // Make sure we don't expose sensitive information
    const user = await User.findById(id).select(
      '_id username firstName lastName'
    );

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};
