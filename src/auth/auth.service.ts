import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import type { Model } from 'mongoose';
import { UsersService } from '../users/users.service.js';
import { AuthMailerService } from './auth-mailer.service.js';
import { AuthSession, OtpChallenge } from './auth.schemas.js';

const otpPepper = requiredSecret('OTP_PEPPER');
const accessTokenTtlMs = 15 * 60 * 1000;
const refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
const otpTtlMs = 10 * 60 * 1000;
const otpCooldownMs = 60 * 1000;
const maxOtpAttempts = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(OtpChallenge.name) private readonly challenges: Model<OtpChallenge>,
    @InjectModel(AuthSession.name) private readonly sessions: Model<AuthSession>,
    private readonly users: UsersService,
    private readonly mailer: AuthMailerService,
    private readonly jwt: JwtService,
  ) {}

  async requestCode(email: string) {
    const now = new Date();
    const code = randomInt(0, 100_000_000).toString().padStart(8, '0');
    const codeHash = this.hashOtp(email, code);

    // shortcut: resend throttling is per email; add per-IP throttling before public deployment.
    try {
      await this.challenges.findOneAndUpdate(
        {
          email,
          $or: [
            { lastSentAt: { $lte: new Date(now.getTime() - otpCooldownMs) } },
            { lastSentAt: { $exists: false } },
          ],
        },
        {
          $set: {
            codeHash,
            lastSentAt: now,
            expiresAt: new Date(now.getTime() + otpTtlMs),
            attempts: 0,
          },
        },
        { upsert: true },
      ).exec();
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }

    try {
      await this.mailer.sendSignInCode(email, code);
    } catch (error) {
      await this.challenges.deleteOne({ email, codeHash }).exec();
      throw error;
    }

    return { message: 'If the address can receive sign-in codes, one has been sent.' };
  }

  async verifyCode(email: string, token: string) {
    const codeHash = this.hashOtp(email, token);
    const challenge = await this.challenges.findOne({ email }).exec();
    const now = new Date();
    if (!challenge || challenge.expiresAt <= now || challenge.attempts >= maxOtpAttempts) {
      throw new UnauthorizedException('Invalid or expired sign-in code');
    }

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const provided = Buffer.from(codeHash, 'hex');
    if (!timingSafeEqual(expected, provided)) {
      await this.challenges.updateOne(
        { _id: challenge._id, attempts: { $lt: maxOtpAttempts }, expiresAt: { $gt: now } },
        { $inc: { attempts: 1 } },
      ).exec();
      throw new UnauthorizedException('Invalid or expired sign-in code');
    }

    const consumed = await this.challenges.findOneAndDelete({
      _id: challenge._id,
      codeHash,
      attempts: { $lt: maxOtpAttempts },
      expiresAt: { $gt: now },
    }).exec();
    if (!consumed) throw new UnauthorizedException('Invalid or expired sign-in code');

    const user = await this.users.findOrCreateByEmail(email);
    const tokens = await this.createSession(user.id, user.email);
    return { ...tokens, user };
  }

  async refresh(refreshToken: string) {
    const session = await this.sessions.findOneAndDelete({
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!session) throw new UnauthorizedException('Invalid or expired refresh token');
    const user = await this.users.getProfile(session.userId.toString());
    return { ...(await this.createSession(user.id, user.email)), user };
  }

  async signOut(refreshToken: string) {
    await this.sessions.deleteOne({ refreshTokenHash: this.hashToken(refreshToken) }).exec();
    return null;
  }

  private async createSession(userId: string, email: string) {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.sessions.create({
      userId,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTokenTtlMs),
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: userId, email }),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTokenTtlMs / 1000,
    };
  }

  private hashOtp(email: string, code: string) {
    return createHmac('sha256', otpPepper).update(`${email}:${code}`).digest('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

function requiredSecret(name: string) {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value) < 32) throw new Error(`${name} must contain at least 32 bytes`);
  return value;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
