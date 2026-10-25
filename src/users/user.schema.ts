import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: '' })
  displayName!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
