import { emailQueue } from '../jobs/emailQueue';
import { Booking } from '../models/booking.model';
import { Event } from '../models/event.model';
import type { AuthenticatedRequest } from '../types/types';
import APIError from '../utils/APIError';
import APIResponse from '../utils/APIResponse';
import asyncHandler from '../utils/asyncHandler';

export const bookTickets = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  const { eventId } = req.params;

  let { noOfTicketsToBook } = req.body;
  noOfTicketsToBook = Number(noOfTicketsToBook);
  if (!noOfTicketsToBook || noOfTicketsToBook <= 0) {
    throw new APIError(400, 'Invalid ticket count');
  }

  const updatedEvent = await Event.findOneAndUpdate(
    {
      _id: eventId,
      status: { $ne: 'cancelled' },
      availableTickets: { $gte: noOfTicketsToBook },
    },
    {
      $inc: { availableTickets: -noOfTicketsToBook },
    },
    {
      returnDocument: 'after',
    },
  );
  if (!updatedEvent) {
    throw new APIError(400, 'Not enough tickets available or event cancelled');
  }

  const booking = await Booking.create({
    event: eventId,
    customer: user._id,
    ticketsBooked: noOfTicketsToBook,
    totalAmount: updatedEvent.pricePerTicket * noOfTicketsToBook,
    status: 'booked',
  });

  await emailQueue.add('BookingSuccessfull', {
    to: user.email,
    message: `You've suceessfully booked ${noOfTicketsToBook} for the event ${updatedEvent.title}`,
  });

  return res
    .status(201)
    .json(new APIResponse(201, { details: booking }, 'Tickets booked successfully'));
});

export const cancelTickets = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  const { eventId } = req.params;

  const ticketsToCancel = Number(req.body.ticketsToCancel);
  if (!ticketsToCancel || ticketsToCancel <= 0 || !Number.isInteger(ticketsToCancel))
    throw new APIError(400, 'Invalid ticket count');

  const booking = await Booking.findOne({ customer: user._id, event: eventId, status: 'booked' });
  if (!booking) throw new APIError(404, 'No active booking found');

  if (ticketsToCancel > booking.ticketsBooked)
    throw new APIError(400, 'Cannot cancel more tickets than booked');

  const pricePerTicket = booking.totalAmount / booking.ticketsBooked;
  booking.ticketsBooked -= ticketsToCancel;
  booking.totalAmount = booking.ticketsBooked * pricePerTicket;
  booking.status = booking.ticketsBooked > 0 ? 'booked' : 'cancelled';

  await Event.findByIdAndUpdate(booking.event, { $inc: { availableTickets: ticketsToCancel } });
  await booking.save();

  return res.status(200).json(new APIResponse(200, {}, 'Tickets cancelled successfully'));
});

export const getAllBookings = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  const allBookings = await Booking.find({ customer: user._id })
    .populate('event', '_id title date')
    .lean();
  if (!allBookings.length)
    return res.status(200).json(new APIResponse(200, { bookings: [] }, "You've not booked any tickets"));

  return res.status(200).json(
    new APIResponse(
      200,
      {
        bookings: allBookings,
      },
      'All Bookings fetched successfully.',
    ),
  );
});
