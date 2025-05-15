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
exports.refreshToken = exports.logout = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const Account_1 = __importStar(require("../models/Account")); // Import Account model
const http_status_codes_1 = require("http-status-codes");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Cookie options for JWT token
const tokenCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
};
/**
 * Create token for authentication
 */
const createToken = (userId, email, role = 'user') => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET is missing from environment variables');
    }
    // @ts-ignore
    return jsonwebtoken_1.default.sign({
        id: userId,
        email: email,
        role: role,
    }, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });
};
/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
    try {
        console.log('Register request received with body:', req.body);
        const { email, password, firstName, lastName, username, phoneNumber, dateOfBirth, address, } = req.body;
        // Validate input
        if (!email || !password || !firstName || !lastName) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please provide all required fields: email, password, firstName, lastName',
                error: 'Missing required fields',
            });
        }
        // Validate password length
        if (password.length < 6) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Password must be at least 6 characters long',
                error: 'Invalid password',
            });
        }
        // Validate email format
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please provide a valid email address',
                error: 'Invalid email format',
            });
        }
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'User with this email already exists',
                error: 'Email already in use',
            });
        }
        // Create new user
        const user = await User_1.default.create({
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
        const accountNumber = await Account_1.default.generateAccountNumber();
        const account = await Account_1.default.create({
            userId: user._id,
            accountNumber,
            type: Account_1.AccountType.MAIN,
            name: 'Main Account',
            balance: 0,
        });
        console.log(`Created default account ${accountNumber} for user ${user._id}`);
        // Generate auth token
        const token = user.generateAuthToken();
        // Set HTTP-only cookie for web clients
        if (req.headers['user-agent'] &&
            req.headers['user-agent'].includes('Mozilla')) {
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });
            console.log('Set cookie for web client');
        }
        // Sanitize user object before sending response (remove password)
        const userObj = user.toObject();
        userObj.password = undefined;
        console.log('User registered successfully:', userObj.email);
        // Respond with user data, token, and account info
        return res.status(http_status_codes_1.StatusCodes.CREATED).json({
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
    }
    catch (error) {
        console.error('Error in register controller:', error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error during registration',
            error: error.message,
        });
    }
};
exports.register = register;
/**
 * Login a user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
    try {
        console.log('Login request received with body:', req.body);
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please provide email and password',
                error: 'Missing email or password',
            });
        }
        // Find user
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials',
                error: 'Invalid email or password',
            });
        }
        // Check if password is correct
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials',
                error: 'Invalid email or password',
            });
        }
        // Generate auth token
        const token = user.generateAuthToken();
        // Set HTTP-only cookie for web clients
        const isWebClient = req.headers['user-agent'] &&
            req.headers['user-agent'].includes('Mozilla');
        if (isWebClient) {
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });
            console.log('Set cookie for web client');
        }
        else {
            console.log('Mobile client detected, not setting cookie');
        }
        // Sanitize user object before sending response (remove password)
        const userObj = user.toObject();
        userObj.password = undefined;
        console.log('User logged in successfully:', userObj.email);
        // Respond with user data and token
        return res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Logged in successfully',
            data: {
                user: userObj,
                token,
            },
        });
    }
    catch (error) {
        console.error('Error in login controller:', error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
};
exports.login = login;
/**
 * Get current user profile
 * @route GET /api/auth/profile
 * @access Private
 */
const getProfile = async (req, res) => {
    try {
        console.log('Get profile request for user:', req.user?.id);
        const userId = req.user?.id;
        // Set cache control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            console.log('Get profile failed: User not found:', userId);
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
            });
        }
        const account = await Account_1.default.findOne({
            userId,
            type: 'MAIN',
        }).select('_id accountNumber balance type name');
        console.log('Profile retrieved successfully for user:', userId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
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
    }
    catch (error) {
        console.error('Get profile error details:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message,
        });
    }
};
exports.getProfile = getProfile;
/**
 * Update user profile
 * @route PUT /api/auth/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
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
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, {
            $set: {
                firstName: firstNameToUpdate,
                lastName: lastNameToUpdate,
                phoneNumber,
                address,
            },
        }, { new: true }).select('-password');
        if (!updatedUser) {
            console.log('Update profile failed: User not found:', userId);
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
            });
        }
        console.log('Profile updated successfully for user:', userId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: updatedUser,
            },
        });
    }
    catch (error) {
        console.error('Update profile error details:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message,
        });
    }
};
exports.updateProfile = updateProfile;
/**
 * Logout a user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res) => {
    try {
        // Clear the auth cookie
        res.clearCookie('token', {
            httpOnly: true,
            path: '/',
        });
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Logout error details:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to logout',
            error: error.message,
        });
    }
};
exports.logout = logout;
// Refresh token
const refreshToken = async (req, res) => {
    try {
        // Get token from header
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }
        if (!token) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'No token provided. Please log in again.',
            });
        }
        // Verify token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Server configuration error. JWT secret is missing.',
            });
        }
        try {
            // Decode token
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            // Find user to make sure they still exist
            const user = await User_1.default.findById(decoded.id);
            if (!user) {
                return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'User not found. Please log in again.',
                });
            }
            // Generate new token
            const newToken = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: '24h' });
            // Set token in cookie for web clients
            if (req.cookies) {
                res.cookie('token', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                });
            }
            // Return the new token
            return res.status(http_status_codes_1.StatusCodes.OK).json({
                success: true,
                data: {
                    token: newToken,
                    expiresIn: 24 * 60 * 60, // 24 hours in seconds
                },
                message: 'Token refreshed successfully',
            });
        }
        catch (error) {
            console.error('Token verification error:', error);
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid or expired token. Please log in again.',
            });
        }
    }
    catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to refresh token. Please try again.',
        });
    }
};
exports.refreshToken = refreshToken;
