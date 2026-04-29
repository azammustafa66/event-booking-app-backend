import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { model, Schema } from 'mongoose';

import { type IUser } from '../types/types';

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    default: 'customer',
  },
  refreshToken: {
    type: String,
    default: '',
  },
  forgotPasswordToken: { type: String },
  forgotPasswordExpiry: { type: Date },
});

userSchema.pre('save', async function (this) {
  // Guard prevents re-hashing an already-hashed password on unrelated saves (e.g. refreshToken update)
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.method('isPasswordCorrect', async function (password: string) {
  return await bcrypt.compare(password, this.password);
});

userSchema.method('generateAccessToken', function (this) {
  return jwt.sign({ _id: this._id.toString() }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY as any,
  });
});

userSchema.method('generateRefreshToken', function () {
  return jwt.sign({ _id: this._id.toString() }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY as any,
  });
});

userSchema.method(
  'generateTempToken',
  function () {
    const unhashedToken = crypto.randomBytes(20).toString('hex');
    // sha512 hash stored in DB; raw token sent to user — comparing them on reset without ever exposing the DB value
    const hashedToken = crypto.createHash('sha512').update(unhashedToken).digest('hex');
    const tempTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15-minute window

    return { unhashedToken, hashedToken, tempTokenExpiry };
  },
  { timestamps: true },
);

export const User = model('User', userSchema);
