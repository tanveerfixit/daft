import { Request } from 'express';

export type UserRole = 'admin' | 'staff' | 'superadmin' | 'developer';
export type UserStatus = 'approved' | 'active' | 'pending' | 'rejected' | 'inactive';

export interface AuthenticatedUser {
  id: number;
  business_id: number;
  branch_id: number | null;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  last_login?: Date | string | null;
  created_at?: Date | string;
  deleted_at?: Date | string | null;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: AuthenticatedUser;
      _sessionToken?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  userId: number;
  user: AuthenticatedUser;
  _sessionToken?: string;
}
