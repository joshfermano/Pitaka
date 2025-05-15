"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.errorHandler = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_status_codes_1 = require("http-status-codes");
/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        // First try to get token from Authorization header (Bearer token)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
            console.log('Auth token found in Authorization header');
        }
        // If no token in header, try cookies (for web clients)
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
            console.log('Auth token found in cookies');
        }
        if (!token) {
            console.log('Authentication failed: No token provided');
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Authentication failed. Please log in again.',
            });
        }
        // Get JWT secret from environment variables
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is missing from environment variables');
            return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Server configuration error. Please contact administrator.',
            });
        }
        // Verify token
        try {
            // @ts-ignore
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            // Set user info in request - Note: We set both id and _id to ensure compatibility
            req.user = {
                _id: decoded.id,
                id: decoded.id,
                email: decoded.email,
                role: decoded.role || 'user', // Default role if not in token
            };
            console.log(`Authenticated user: ${req.user.email} (${req.user.id})`);
            // Proceed to the protected route
            next();
        }
        catch (jwtError) {
            console.error('JWT verification error:', jwtError.message);
            // Return specific error message for token issues
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Your session has expired. Please log in again.',
                });
            }
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Authentication failed. Invalid token.',
            });
        }
    }
    catch (error) {
        console.error('Authentication error:', error.message);
        return res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error during authentication.',
        });
    }
};
exports.protect = protect;
/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Global error handler:', err);
    // Custom error response
    res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development'
            ? err.message
            : 'An unexpected error occurred',
    });
};
exports.errorHandler = errorHandler;
/**
 * Restrict access to certain roles
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Authentication required',
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(http_status_codes_1.StatusCodes.FORBIDDEN).json({
                success: false,
                message: 'You do not have permission to perform this action',
            });
        }
        next();
    };
};
exports.restrictTo = restrictTo;
