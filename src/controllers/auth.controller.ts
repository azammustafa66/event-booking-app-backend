import crypto, { hash } from 'crypto';

import { emailQueue } from '../jobs/emailQueue';
import { User } from '../models/user.model';
import type { AuthenticatedRequest } from '../types/types';
import APIError from '../utils/APIError';
import APIResponse from '../utils/APIResponse';
import asyncHandler from '../utils/asyncHandler';
import { CookieOptions } from '../utils/constants';

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) throw new APIError(400, 'Send all required details');

  // Scoped uniqueness: same email can register as both 'customer' and 'organizer'
  const isExisting = await User.findOne({ email: email, role: role });
  if (isExisting) throw new APIError(409, 'User already exists. Please login');

  const user = await User.create({
    name,
    email,
    password,
    role,
  });

  await emailQueue.add('RegistrationEmail', { to: email });

  const {
    password: _password,
    refreshToken: _refreshToken,
    forgotPasswordToken,
    forgotPasswordExpiry,
    ...safeUser
  } = user.toObject();

  return res
    .status(201)
    .json(new APIResponse(201, { user: safeUser }, 'User created successfully. Please login'));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new APIError(422, 'Email/Password missing');

  const user = await User.findOne({ email });
  if (!user) throw new APIError(404, 'User does not exist');

  const isPasswordCorrect = user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new APIError(401, 'Invalid Credentials');

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  // validateBeforeSave: false — skip schema validators to avoid re-hashing the already-hashed password
  await user.save({ validateBeforeSave: false });

  const {
    password: _password,
    refreshToken: _refreshToken,
    forgotPasswordToken,
    forgotPasswordExpiry,
    ...safeUser
  } = user.toObject();

  return res
    .status(200)
    .cookie('refreshToken', refreshToken, CookieOptions)
    .cookie('accessToken', accessToken, CookieOptions)
    .json(new APIResponse(200, { user: safeUser }, 'User logged in successfully'));
});

export const logoutUser = asyncHandler(async (req: AuthenticatedRequest, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
  });

  return res
    .status(200)
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json(new APIResponse(200, {}, 'User logged out successfully.'));
});

export const generateNewRefreshToken = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const incomingRefreshToken = (req.cookies?.refreshToken ||
    req.header('Authorization')?.replace('Bearer ', '')) as string;
  if (!incomingRefreshToken) throw new APIError(401, 'Invalid refresh token');

  const user = await User.findOne({ refreshToken: incomingRefreshToken });
  if (!user) throw new APIError(401, 'Invalid refresh token, please login again');

  if (incomingRefreshToken !== user.refreshToken)
    throw new APIError(401, 'Refresh token expired or used');

  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshToken = newRefreshToken;
  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .cookie('accessToken', newAccessToken, CookieOptions)
    .cookie('refreshToken', newRefreshToken, CookieOptions)
    .json(new APIResponse(200, {}, 'Tokens refreshed successfully'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new APIError(401, 'Email is required to reset your password');

  const user = await User.findOne({ email });
  if (!user) throw new APIError(404, 'User does not exist. Please enter a valid email');

  const { unhashedToken, hashedToken, tempTokenExpiry } = user.generateTempToken();
  user.forgotPasswordToken = hashedToken;  // only the hash is persisted — raw token travels only in the email link
  user.forgotPasswordExpiry = tempTokenExpiry;
  user.save({ validateBeforeSave: false });

  // unhashedToken goes in the magic-link URL; on click, it is re-hashed and compared against forgotPasswordToken
  await emailQueue.add('ForgotPasswordEmail', { to: user.email });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password: newPassword } = req.body;
  if (!newPassword) throw new APIError(400, 'New password is required');

  const hashedToken = crypto
    .createHash('sha512')
    .update(resetToken as string)
    .digest('hex');

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) throw new APIError(400, 'Token is invalid or has expired');

  user.password = newPassword;
  user.forgotPasswordExpiry = null;
  user.forgotPasswordToken = null;
  user.save();

  await emailQueue.add('PasswordResetSuccessfull', { to: user.email });

  return res.status(200).json(new APIResponse(200, {}, 'Password reset successfull.'));
});
