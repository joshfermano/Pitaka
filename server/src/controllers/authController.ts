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
    const {
      email,
      password,
      firstName,
      lastName,
      username,
      phoneNumber,
      dateOfBirth,
      address,
    } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          'Please provide all required fields: email, password, firstName, lastName',
        error: 'Missing required fields',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'Invalid password',
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Please provide a valid email address',
        error: 'Invalid email format',
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
      username: username || email.split('@')[0], // Use provided username or generate from email
      email,
      password, // Password will be hashed in the pre-save hook
      firstName,
      lastName,
      phoneNumber: phoneNumber || '0000000000',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('2000-01-01'),
      address: {
        street: address?.street || 'Default Street',
        city: address?.city || 'Default City',
        state: address?.state || 'Default State',
        zipCode: address?.zipCode || '00000',
        country: address?.country || 'Default Country',
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

    // Set cache control headers to prevent caching
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.log('Get profile failed: User not found:', userId);
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    const account = await Account.findOne({
      userId,
      type: 'MAIN',
    }).select('_id accountNumber balance type name');

    console.log('Profile retrieved successfully for user:', userId);
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        user,
        mainAccount: account
          ? {
              id: account._id,
              accountNumber: account.accountNumber,
              name: account.name || account.type,
              balance: account.balance,
              type: account.type,
            }
          : null,
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

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get token from header
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'No token provided. Please log in again.',
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server configuration error. JWT secret is missing.',
      });
    }

    try {
      // Decode token
      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
        email: string;
      };

      // Find user to make sure they still exist
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not found. Please log in again.',
        });
      }

      // Generate new token
      const newToken = jwt.sign(
        { id: user._id, email: user.email },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Set token in cookie for web clients
      if (req.cookies) {
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }

      // Return the new token
      return res.status(StatusCodes.OK).json({
        success: true,
        data: {
          token: newToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to refresh token. Please try again.',
    });
  }
};
