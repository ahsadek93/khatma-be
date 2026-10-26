import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { User } from '../users/user.schema.js';
import { Khatma } from './khatma.schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';

@Injectable()
export class KhatmasService {
  constructor(
    @InjectModel(Khatma.name) private readonly khatmas: Model<Khatma>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(userId: string, name: string) {
    const khatma = await this.khatmas.create({
      name,
      createdBy: userId,
      members: [{ userId, role: 'owner' }],
      quranJuz: Array.from({ length: 30 }, (_, index) => ({ juzNumber: index + 1 })),
    });
    return { id: khatma.id, name: khatma.name };
  }

  async createZikr(userId: string, name: string, phrase: string, goalCount: number) {
    const khatma = await this.khatmas.create({
      name,
      type: 'zikr',
      createdBy: userId,
      members: [{ userId, role: 'owner' }],
      zikrPhrase: phrase,
      zikrGoalCount: goalCount,
      zikrCompletedCount: 0,
      zikrClaims: [],
    });
    return { id: khatma.id, name: khatma.name };
  }

  async join(userId: string, code: string) {
    const memberId = new Types.ObjectId(userId);
    let khatma = await this.khatmas.findOneAndUpdate(
      { joinCode: code, status: 'active', 'members.userId': { $ne: memberId } },
      { $push: { members: { userId: memberId, role: 'member' } } },
      { returnDocument: 'after' },
    ).exec();
    const joined = Boolean(khatma);
    if (!khatma) khatma = await this.khatmas.findOne({ joinCode: code, status: 'active', 'members.userId': memberId }).exec();
    if (!khatma) throw new NotFoundException('Khatma code is invalid or inactive');
    if (joined) this.realtime.publish(khatma.id, 'membersChanged');
    return { id: khatma.id, type: khatma.type };
  }

  async list(userId: string, status: 'active' | 'completed', type: 'quran' | 'zikr') {
    const khatmas = await this.khatmas.find({ 'members.userId': userId, status, type }).exec();
    khatmas.sort((a, b) =>
      a.members.find((member) => member.userId.toString() === userId)!.joinedAt.getTime() -
      b.members.find((member) => member.userId.toString() === userId)!.joinedAt.getTime(),
    );
    return khatmas.map((khatma) => status === 'active'
      ? { id: khatma.id, name: khatma.name, type: khatma.type, memberCount: khatma.members.length }
      : { id: khatma.id, name: khatma.name, type: khatma.type, completedAt: khatma.completedAt?.toISOString() ?? '' });
  }

  async members(userId: string, id: string) {
    const khatma = await this.getMemberKhatma(userId, id);
    const userIds = khatma.members.map((member) => member.userId);
    const users = await this.users.find({ _id: { $in: userIds } }).select('_id displayName').lean().exec();
    const names = new Map(users.map((user) => [user._id.toString(), user.displayName || null]));
    return [...khatma.members]
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
      .map((member) => ({ userId: member.userId.toString(), displayName: names.get(member.userId.toString()) ?? null, role: member.role, joinedAt: member.joinedAt.toISOString() }));
  }

  async invite(userId: string, id: string) {
    const khatma = await this.getMemberKhatma(userId, id);
    return { joinCode: khatma.joinCode };
  }

  private async getMemberKhatma(userId: string, id: string) {
    const khatma = await this.khatmas.findOne({ _id: id, 'members.userId': userId }).exec();
    if (!khatma) {
      if (await this.khatmas.exists({ _id: id })) throw new ForbiddenException('Only Khatma members can view this Khatma');
      throw new NotFoundException('Khatma not found');
    }
    return khatma;
  }
}
