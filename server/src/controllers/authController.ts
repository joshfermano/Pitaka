import { Request, Response } from 'express';
import User from '../models/User';
import Account, { AccountType } from '../models/Account'; // Import Account model
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

// Cookie options for JWT token
const tokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
} as const;

/**
 * Create token for authentication
 */
const createToken = (userId: string, email: string, role: string = 'user') => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  // @ts-ignore
  return jwt.sign(
    {
      id: userId,
      email: email,
      role: role,
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req: Request, res: Response) => {
  try {
    console.log('Register request received with body:', req.body);
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide all required fields',
        error: 'Missing required fields',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User with this email already exists',
        error: 'Email already in use',
      });
    }

    // Create new user
    const user = await User.create({
      username: email.split('@')[0], // Generate username from email
      email,
      password, // Password will be hashed in the pre-save hook
      firstName,
      lastName,
      phoneNumber: phoneNumber || '0000000000', // Use provided phone number or default
      dateOfBirth: new Date('2000-01-01'), // Default value
      address: {
        street: 'Default Street',
        city: 'Default City',
        state: 'Default State',
        zipCode: '00000',
        country: 'Default Country',
      },
    });

    // Create default account for the user
    const accountNumber = await Account.generateAccountNumber();
    const account = await Account.create({
      userId: user._id,
      accountNumber,
      type: AccountType.MAIN,
      name: 'Main Account',
      balance: 0,
    });

    console.log(
      `Created default account ${accountNumber} for user ${user._id}`
    );

    // Generate auth token
    const token = user.generateAuthToken();

    // Set HTTP-only cookie for web clients
    if (
      req.headers['user-agent'] &&
      req.headers['user-agent'].includes('Mozilla')
    ) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });
      console.log('Set cookie for web client');
    }

    // Sanitize user object before sending response (remove password)
    const userObj = user.toObject() as any;
    userObj.password = undefined;

    console.log('User registered successfully:', userObj.email);

    // Respond with user data, token, and account info
    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userObj,
        token,
        account: {
          id: account._id,
          accountNumber: account.accountNumber,
          type: account.type,
          name: account.name,
          balance: account.balance,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in register controller:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    console.log('Login request received with body:', req.body);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide email and password',
        error: 'Missing email or password',
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Invalid email or password',
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Invalid email or password',
      });
    }

    // Generate auth token
    const token = user.generateAuthToken();

    // Set HTTP-only cookie for web clients
    const isWebClient =
      req.headers['user-agent'] &&
      req.headers['user-agent'].includes('Mozilla');
    if (isWebClient) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });
      console.log('Set cookie for web client');
    } else {
      console.log('Mobile client detected, not setting cookie');
    }

    // Sanitize user object before sending response (remove password)
    const userObj = user.toObject() as any;
    userObj.password = undefined;

    console.log('User logged in successfully:', userObj.email);

    // Respond with user data and token
    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: userObj,
        token,
      },
    });
  } catch (error: any) {
    console.error('Error in login controller:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    console.log('Get profile request for user:', req.user?.id);
    const userId = req.user?.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.log('Get profile failed: User not found:', userId);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('Profile retrieved successfully for user:', userId);
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error: any) {
    console.error('Get profile error details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    console.log('Update profile request:', JSON.stringify(req.body, null, 2));
    const userId = req.user?.id;
    const { firstName, lastName, phoneNumber, address, name } = req.body;

    // Handle name field if provided
    let firstNameToUpdate = firstName;
    let lastNameToUpdate = lastName;

    if (name && !firstName && !lastName) {
      const nameParts = name.split(' ');
      firstNameToUpdate = nameParts[0];
      lastNameToUpdate = nameParts.slice(1).join(' ') || '';
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          firstName: firstNameToUpdate,
          lastName: lastNameToUpdate,
          phoneNumber,
          address,
        },
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      console.log('Update profile failed: User not found:', userId);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('Profile updated successfully for user:', userId);
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error: any) {
    console.error('Update profile error details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

/**
 * Logout a user
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Clear the auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      path: '/',
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to logout',
      error: error.message,
    });
  }
};
