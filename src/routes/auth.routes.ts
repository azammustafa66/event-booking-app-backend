import { Router } from 'express';
import {
  forgotPassword,
  generateNewRefreshToken,
  loginUser,
  registerUser,
  resetPassword,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validator.middleware';
import { userAuthValidator, validateEmail, validatePassword } from '../validators';
import { verifyJWT } from '../middleware/auth.middleware';

const router = Router();

router.route('/register').post(userAuthValidator, validate, registerUser);
router.route('/login').post(userAuthValidator, validate, loginUser);

router.route('/forgot-password').post([validateEmail], validate, forgotPassword);
router.route('/reset-password/:resetToken').post([validatePassword], validate, resetPassword);

router.route('/refresh-token').post(verifyJWT, generateNewRefreshToken);

export default router;