import { IUser } from '../models/User';

// Extended Request interface with AuthRequest properties
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        _id: string;
        email: string;
        role: string;
      };
      // Explicitly add missing properties that were causing errors
      body: any;
      params: any;
      query: any;
    }
  }
}

// This ensures compatibility with the TypeScript module system
export {};
