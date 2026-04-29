import { body } from 'express-validator';

export const validateEmail = body('email')
  .notEmpty()
  .withMessage('Email cannot be empty')
  .trim()
  .isEmail()
  .withMessage('Enter a valid email address');

export const validatePassword = body('password')
  .notEmpty()
  .withMessage('Password cannot be empty')
  .isLength({ min: 8, max: 16 })
  .withMessage('Password must be minimum 8 chars long and maximum 16');

export const userAuthValidator = [validateEmail, validatePassword];