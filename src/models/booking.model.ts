import { model, Schema, Types } from 'mongoose';

import { type IBooking } from '../types/types';

const bookingSchema = new Schema<IBooking>(
  {
    event: { type: Types.ObjectId, ref: 'Event', required: true, index: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    ticketsBooked: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, required: true },
  },
  { timestamps: true },
);

export const Booking = model('Booking', bookingSchema);

