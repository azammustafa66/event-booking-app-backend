import { emailQueue } from '../jobs/emailQueue';
import { Booking } from '../models/booking.model';
import { Event } from '../models/event.model';
import type { AuthenticatedRequest } from '../types/types';
import APIError from '../utils/APIError';
import APIResponse from '../utils/APIResponse';
import asyncHandler from '../utils/asyncHandler';

export const getAllEventsCreatedByOrganizer = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;
    if (user.role !== 'organizer') throw new APIError(403, 'You are not a organizer');

    const allEvents = await Event.find({ organizer: user._id }).lean();

    return res
      .status(200)
      .json(new APIResponse(200, { events: allEvents }, 'All events fetched successfully'));
  },
);

export const createEvent = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = req.user;
  if (user.role !== 'organizer') throw new APIError(403, 'Only organizers can create events');

  const { title, description, date, venue, totalTickets, availableTickets, pricePerTicket } =
    req.body;

  if (!title || !date || !venue || !totalTickets || !availableTickets || !pricePerTicket)
    throw new APIError(400, 'Please send all necessary data');

  const newEvent = await Event.create({
    title,
    description,
    date,
    venue,
    totalTickets,
    availableTickets,
    pricePerTicket,
    organizer: user._id,
    status: 'upcoming',
  });

  await emailQueue.add('EventCreated', {
    to: req.user.email,
    message: 'Event created succesfully',
  });

  return res
    .status(201)
    .json(new APIResponse(201, { event: newEvent }, 'Event created successfully'));
});

export const updateEvent = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  if (!eventId) throw new APIError(400, 'Event ID is required to update a event');
  const allowedFields = [
    'title',
    'description',
    'date',
    'venue',
    'totalTickets',
    'availableTickets',
    'pricePerTicket',
    'status',
  ];

  const toUpdate = Object.fromEntries(
    Object.entries(req.body).filter(
      ([key, value]) => allowedFields.includes(key) && (value !== undefined || value !== ''),
    ),
  );

  if (!Object.keys(toUpdate).length) throw new APIError(400, 'No valid fields provided to update');

  const updatedEvent = await Event.findByIdAndUpdate(
    eventId,
    { $set: toUpdate },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );

  if (!updatedEvent) throw new APIError(404, 'Event not found');

  await emailQueue.add('EventUpdated', {
    to: req.user.email,
    message: 'Event updated succesfully',
  });

  return res
    .status(200)
    .json(new APIResponse(200, { event: updatedEvent }, 'Event updated successfully'));
});

export const deleteEvent = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { eventId } = req.params;
  if (!eventId) throw new APIError(400, 'Event ID is required to update a event');
  const event = await Event.findById(eventId);
  if (!event) throw new APIError(404, 'Event does not exist');

  event.status = 'cancelled';
  await event.save({ validateBeforeSave: false });

  // Fetch before updating so we have customer emails for the notification
  const bookings = await Booking.find({ event: eventId })
    .populate<{ customer: { email: string } }>('customer', 'email')
    .lean();

  await Booking.updateMany({ event: eventId }, { $set: { status: 'cancelled' } });

  await emailQueue.add('EventDeleted', {
    to: req.user.email,
    message: 'Event deleted succesfully',
  });

  await emailQueue.add('EventCancelledToCustomers', {
    to: bookings.map((b) => b.customer?.email).filter(Boolean),
    message: 'Event has been cancelled. Your money will be refunded to original source',
  });

  return res.status(200).json(new APIResponse(200, {}, 'Event deleted succesfully'));
});

export const showAllBookings = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const eventIds = await Event.find({ organizer: req.user._id }).distinct('_id');

  const bookings = await Booking.find({ event: { $in: eventIds } })
    .populate('event', 'title date venue')
    .populate('customer', 'name email')
    .lean();

  return res.status(200).json(new APIResponse(200, { bookings }, 'Bookings fetched successfully'));
});
