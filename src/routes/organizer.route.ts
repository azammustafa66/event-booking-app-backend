import { Router } from 'express';

import { verifyJWT, checkOrganizer } from '../middleware/auth.middleware';
import {
  createEvent,
  deleteEvent,
  getAllEventsCreatedByOrganizer,
  showAllBookings,
  updateEvent,
} from '../controllers/organizer.controller';

const router = Router();

router.use(verifyJWT);

router.route('/all-events').get(getAllEventsCreatedByOrganizer);
router.route('/create-event').post(createEvent);
router.route('/:eventId').patch(checkOrganizer, updateEvent).delete(checkOrganizer, deleteEvent);
router.route('/bookings').get(showAllBookings);

export default router;