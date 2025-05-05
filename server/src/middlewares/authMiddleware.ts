import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { StatusCodes } from 'http-status-codes';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to protect routes that require authentication
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;
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
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication failed. Please log in again.',
      });
    }

    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is missing from environment variables');
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Server configuration error. Please contact administrator.',
      });
    }

    // Verify token
    try {
      // @ts-ignore
      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
        email: string;
        role?: string;
      };

      // Set user info in request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user', // Default role if not in token
      };

      console.log(`Authenticated user: ${req.user.email} (${req.user.id})`);

      // Proceed to the protected route
      next();
    } catch (jwtError: any) {
      console.error('JWT verification error:', jwtError.message);

      // Return specific error message for token issues
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
        });
      }

      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication failed. Invalid token.',
      });
    }
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Global error handler:', err);

  // Custom error response
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Server error',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
  });
};

/**
 * Restrict access to certain roles
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};
