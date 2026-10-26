import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Khatma } from '../khatmas/khatma.schema.js';
import { User } from '../users/user.schema.js';

@Injectable()
export class QuranService {
  constructor(
    @InjectModel(Khatma.name) private readonly khatmas: Model<Khatma>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async getJuz(userId: string, id: string) {
    const khatma = await this.getKhatma(userId, id);
    const claimedBy = [...new Set(khatma.quranJuz!.flatMap((juz) => juz.claimedBy ? [juz.claimedBy.toString()] : []))];
    const users = await this.users.find({ _id: { $in: claimedBy } }).select('_id displayName').lean().exec();
    const names = new Map(users.map((user) => [user._id.toString(), user.displayName || 'A Khatma member']));
    return khatma.quranJuz!.map((juz) => ({
      juzNumber: juz.juzNumber,
      status: juz.status,
      claimedBy: juz.claimedBy?.toString() ?? null,
      claimedByName: juz.claimedBy ? names.get(juz.claimedBy.toString()) ?? 'A Khatma member' : null,
    }));
  }

  async getProgress(userId: string, id: string) {
    const khatma = await this.getKhatma(userId, id);
    return {
      completedJuz: khatma.quranJuz!.filter((juz) => juz.status === 'completed').length,
      selectedJuz: khatma.quranJuz!.filter((juz) => juz.status === 'claimed' && juz.claimedBy?.toString() === userId).map((juz) => juz.juzNumber),
    };
  }

  claim(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'claim');
  }

  release(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'release');
  }

  complete(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'complete');
  }

  private async applyAction(userId: string, id: string, juzNumber: number, action: 'claim' | 'release' | 'complete') {
    await this.getKhatma(userId, id);
    const now = new Date();
    const filter = action === 'claim'
      ? { _id: id, type: 'quran', status: 'active', 'members.userId': userId, quranJuz: { $elemMatch: { juzNumber, status: 'free' } } } as const
      : { _id: id, type: 'quran', status: 'active', 'members.userId': userId, quranJuz: { $elemMatch: { juzNumber, status: 'claimed', claimedBy: userId } } } as const;
    const update = action === 'claim'
      ? { $set: { 'quranJuz.$.status': 'claimed', 'quranJuz.$.claimedBy': userId, 'quranJuz.$.claimedAt': now } }
      : action === 'release'
        ? { $set: { 'quranJuz.$.status': 'free', 'quranJuz.$.claimedBy': null, 'quranJuz.$.claimedAt': null } }
        : { $set: { 'quranJuz.$.status': 'completed', 'quranJuz.$.completedAt': now } };
    const result = await this.khatmas.updateOne(filter, update).exec();
    if (result.modifiedCount !== 1) throw new ConflictException(action === 'claim' ? 'Juz is unavailable' : 'You do not hold this Juz');

    if (action === 'complete') {
      await this.khatmas.updateOne(
        { _id: id, type: 'quran', status: 'active', quranJuz: { $not: { $elemMatch: { status: { $ne: 'completed' } } } } },
        [{ $set: { status: 'completed', completedAt: { $ifNull: ['$completedAt', now] } } }],
      ).exec();
    }
    return null;
  }

  private async getKhatma(userId: string, id: string) {
    let khatma = await this.khatmas.findOne({ _id: id, type: 'quran', 'members.userId': userId }).exec();
    if (!khatma) {
      if (await this.khatmas.exists({ _id: id, type: 'quran' })) throw new ForbiddenException('Only Khatma members can view Quran progress');
      throw new NotFoundException('Quran Khatma not found');
    }

    if (khatma.quranJuz?.length !== 30) {
      if (khatma.quranJuz?.length) throw new ConflictException('Quran Khatma progress is invalid');
      await this.khatmas.updateOne(
        { _id: id, type: 'quran', $or: [{ quranJuz: { $exists: false } }, { quranJuz: { $size: 0 } }] },
        { $set: { quranJuz: Array.from({ length: 30 }, (_, index) => ({ juzNumber: index + 1 })) } },
      ).exec();
      khatma = await this.khatmas.findById(id).exec();
    }
    if (!khatma?.quranJuz || khatma.quranJuz.length !== 30) throw new ConflictException('Quran Khatma progress is invalid');
    return khatma;
  }
}
