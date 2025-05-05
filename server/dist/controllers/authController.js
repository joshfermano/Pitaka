"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const http_status_codes_1 = require("http-status-codes");
// Cookie options for JWT token
const tokenCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
};
/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
    try {
        console.log('Register request received with body:', JSON.stringify({
            ...req.body,
            password: req.body.password ? '[HIDDEN]' : undefined,
        }));
        const { username, name, email, password, phoneNumber, dateOfBirth, address, } = req.body;
        if (!email || !password) {
            console.log('Registration failed: Missing required fields (email, password)');
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email and password are required',
            });
        }
        // Parse name into firstName and lastName if provided as full name
        let firstName = req.body.firstName;
        let lastName = req.body.lastName;
        if (name && !firstName && !lastName) {
            const nameParts = name.split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ') || '';
        }
        console.log('Parsed name:', { firstName, lastName });
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            console.log('Registration failed: Email already exists:', email);
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'User with this email already exists',
            });
        }
        // Default values for optional fields
        const defaultPhoneNumber = phoneNumber || '0000000000';
        const defaultDateOfBirth = dateOfBirth || new Date('2000-01-01');
        const defaultAddress = {
            street: address?.street || 'Default Street',
            city: address?.city || 'Default City',
            state: address?.state || 'Default State',
            zipCode: address?.zipCode || '00000',
            country: address?.country || 'Default Country',
        };
        console.log('Creating user with data:', {
            username: username || email.split('@')[0],
            email,
            firstName,
            lastName,
            phoneNumber: defaultPhoneNumber,
            dateOfBirth: defaultDateOfBirth,
            address: defaultAddress,
        });
        // Create new user with adjusted fields
        const user = await User_1.default.create({
            username: username || email.split('@')[0], // Use part of email as username if not provided
            email,
            password,
            firstName,
            lastName,
            phoneNumber: defaultPhoneNumber,
            dateOfBirth: defaultDateOfBirth,
            address: defaultAddress,
        });
        // Generate token
        const token = user.generateAuthToken();
        console.log('User created successfully:', user._id);
        // Set JWT token in a httpOnly cookie
        res.cookie('token', token, tokenCookieOptions);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    _id: user._id,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                token, // Still include token in response for mobile clients
            },
        });
    }
    catch (error) {
        console.error('Registration error details:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to register user',
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
        console.log('Login request received with body:', JSON.stringify({
            ...req.body,
            password: req.body.password ? '[HIDDEN]' : undefined,
        }));
        const { email, password } = req.body;
        if (!email || !password) {
            console.log('Login failed: Missing required fields (email, password)');
            return res.status(http_status_codes_1.StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email and password are required',
            });
        }
        // Check if user exists
        const user = await User_1.default.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found:', email);
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        // Check if password is correct
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('Login failed: Invalid password for user:', email);
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        // Generate token
        const token = user.generateAuthToken();
        console.log('User logged in successfully:', user._id);
        // Set JWT token in a httpOnly cookie
        res.cookie('token', token, tokenCookieOptions);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    _id: user._id,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
                token, // Still include token in response for mobile clients
            },
        });
    }
    catch (error) {
        console.error('Login error details:', error);
        res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to login',
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
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            console.log('Get profile failed: User not found:', userId);
            return res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found',
            });
        }
        console.log('Profile retrieved successfully for user:', userId);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            data: {
                user,
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
