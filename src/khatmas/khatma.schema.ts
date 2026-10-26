import { randomBytes } from 'node:crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type { Types } from 'mongoose';

@Schema({ _id: false })
export class KhatmaMember {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;
  @Prop({ required: true, enum: ['owner', 'member'], default: 'member' })
  role!: 'owner' | 'member';
  @Prop({ required: true, default: Date.now })
  joinedAt!: Date;
}

const KhatmaMemberSchema = SchemaFactory.createForClass(KhatmaMember);

@Schema({ _id: false })
export class QuranJuz {
  @Prop({ required: true, min: 1, max: 30 })
  juzNumber!: number;
  @Prop({ required: true, enum: ['free', 'claimed', 'completed'], default: 'free' })
  status!: 'free' | 'claimed' | 'completed';
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  claimedBy!: Types.ObjectId | null;
  @Prop({ default: null })
  claimedAt!: Date | null;
  @Prop({ default: null })
  completedAt!: Date | null;
}

const QuranJuzSchema = SchemaFactory.createForClass(QuranJuz);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Khatma {
  @Prop({ required: true, trim: true, minlength: 1, maxlength: 100 })
  name!: string;
  @Prop({ required: true, unique: true, default: () => randomBytes(9).toString('hex').toUpperCase() })
  joinCode!: string;
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  createdBy!: Types.ObjectId;
  @Prop({ required: true, enum: ['quran', 'zikr'], default: 'quran', index: true })
  type!: 'quran' | 'zikr';
  @Prop({ required: true, enum: ['active', 'completed'], default: 'active', index: true })
  status!: 'active' | 'completed';
  @Prop({ default: null })
  completedAt!: Date | null;
  @Prop({ type: [KhatmaMemberSchema], default: [] })
  members!: KhatmaMember[];
  @Prop({ type: [QuranJuzSchema], default: undefined })
  quranJuz?: QuranJuz[];
}

export const KhatmaSchema = SchemaFactory.createForClass(Khatma);
KhatmaSchema.index({ 'members.userId': 1, status: 1, type: 1 });
