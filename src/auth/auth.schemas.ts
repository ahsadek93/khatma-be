import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type { Types } from 'mongoose';

@Schema()
export class OtpChallenge {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  codeHash!: string;

  @Prop({ required: true })
  lastSentAt!: Date;

  @Prop({ required: true, expires: 0 })
  expiresAt!: Date;

  @Prop({ default: 0 })
  attempts!: number;
}

export const OtpChallengeSchema = SchemaFactory.createForClass(OtpChallenge);

@Schema()
export class AuthSession {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  refreshTokenHash!: string;

  @Prop({ required: true, expires: 0 })
  expiresAt!: Date;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
