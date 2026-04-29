import { Router } from 'express';

import authRouter from './auth.routes';
import organizerRouter from './organizer.route';
import userRouter from './user.routes';

const api = Router();

api.use('/auth', authRouter);
api.use('/event', organizerRouter);
api.use('/tickets', userRouter);

export const mainRouter = api;
