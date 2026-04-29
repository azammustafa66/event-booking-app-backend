import type { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'organizer';
  refreshToken: string | null;
  forgotPasswordToken: string | null;
  forgotPasswordExpiry: Date | null;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  generateTempToken(): { unhashedToken: string; hashedToken: string; tempTokenExpiry: Date };
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  venue: string;
  totalTickets: number;
  availableTickets: number;
  pricePerTicket: number;
  organizer: Types.ObjectId;
  status: 'upcoming' | 'cancelled';
}

export interface IBooking extends Document {
  event: Types.ObjectId;
  customer: Types.ObjectId;
  ticketsBooked: number;
  totalAmount: number;
  status: 'booked' | 'cancelled';
}

export interface AuthenticatedRequest extends Request {
  user: IUser;
}
