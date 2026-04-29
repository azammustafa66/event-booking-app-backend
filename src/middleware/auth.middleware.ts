import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import APIError from '../utils/APIError';
import { User } from '../models/user.model';
import type { AuthenticatedRequest } from '../types/types';
import asyncHandler from '../utils/asyncHandler';
import { Event } from '../models/event.model';

export const verifyJWT = asyncHandler(
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      // Prefer cookie; fall back to a custom 'accessToken' header for non-browser clients
      const incomingAccessToken =
        req.cookies.accessToken || req.header('accessToken')?.replace('Bearer ', '');
      if (!incomingAccessToken) {
        logger.warn('Unauthorized request — no token provided');
        throw new APIError(401, 'Unauthorized Request');
      }

      const { _id } = jwt.verify(incomingAccessToken, process.env.ACCESS_TOKEN_SECRET!) as {
        _id: string;
      };
      const user = await User.findOne({ _id }).select(
        '-password -refreshToken -forgotPassworsToken -forgotPasswordExpiry',
      );
      if (!user) throw new APIError(401, 'Invalid Token. Please login again');

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  },
);

export const checkOrganizer = asyncHandler(async (req: AuthenticatedRequest, _res, next) => {
  const user = req.user;

  if (user.role !== 'organizer') throw new APIError(403, 'Only organizers');

  const event = await Event.findById(req.params.eventId);
  if (!event) throw new APIError(404, 'Event not found');

  if (!event.organizer.equals(user._id)) throw new APIError(403, 'You did not organize this event');

  next();
});

export const checkUser = asyncHandler(async (req: AuthenticatedRequest, _res, next) => {
  const user = req.user;
  if (user.role !== 'customer') throw new APIError(403, 'Only customers can book tickets');

  next();
})