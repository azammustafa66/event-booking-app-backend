import { model, Schema, Types } from 'mongoose';
import { type IEvent } from '../types/types';

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, unique: true, index: true },
    description: String,
    date: { type: Date, required: true },
    venue: { type: String, required: true, trim: true },
    totalTickets: { type: Number, required: true, min: 50 },
    availableTickets: { type: Number, required: true, min: 1 },
    pricePerTicket: { type: Number, required: true },
    organizer: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, required: true },
  },
  { timestamps: true },
);

eventSchema.pre('validate', function () {
  if (this.isNew && (this.availableTickets === undefined || this.availableTickets === null)) {
    this.availableTickets = this.totalTickets;
  }
});

export const Event = model('Event', eventSchema);
