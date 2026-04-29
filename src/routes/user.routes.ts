import { Router } from 'express';

import { verifyJWT, checkUser } from '../middleware/auth.middleware';
import { bookTickets, cancelTickets, getAllBookings } from '../controllers/user.controller';

const router = Router();

router.use(verifyJWT, checkUser);

router.route('/:eventId').post(bookTickets).patch(cancelTickets);
router.route('/all-tickets').get(getAllBookings);

export default router;
