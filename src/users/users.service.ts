import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User } from './user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  async findOrCreateByEmail(email: string) {
    const user = await this.users.findOneAndUpdate(
      { email },
      { $setOnInsert: { email } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    ).exec();
    if (!user) throw new Error('Unable to create user');
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async getProfile(id: string) {
    const user = await this.users.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async updateDisplayName(id: string, displayName: string) {
    const user = await this.users.findByIdAndUpdate(id, { displayName }, { returnDocument: 'after', runValidators: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
