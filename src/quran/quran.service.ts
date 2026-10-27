import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { HydratedDocument, Model } from 'mongoose';
import { Khatma } from '../khatmas/khatma.schema.js';
import { User } from '../users/user.schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';

const JUZ_COUNT = 30;
const UNKNOWN_MEMBER = 'A Khatma member';
const QURAN = { type: 'quran' } as const;

/** A Khatma whose `quranJuz` is guaranteed to be fully seeded. */
type QuranKhatma = HydratedDocument<Khatma> & {
  quranJuz: NonNullable<Khatma['quranJuz']>;
};

@Injectable()
export class QuranService {
  constructor(
    @InjectModel(Khatma.name) private readonly khatmas: Model<Khatma>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly realtime: RealtimeService,
  ) {}

  // ---------------------------------------------------------------- queries

  async getJuz(userId: string, id: string) {
    const { quranJuz } = await this.getKhatma(userId, id);
    const names = await this.loadDisplayNames(
      quranJuz.flatMap((juz) =>
        juz.claimedBy ? [juz.claimedBy.toString()] : [],
      ),
    );

    return quranJuz.map((juz) => {
      const claimedBy = juz.claimedBy?.toString() ?? null;
      return {
        juzNumber: juz.juzNumber,
        status: juz.status,
        claimedBy,
        claimedByName: claimedBy
          ? (names.get(claimedBy) ?? UNKNOWN_MEMBER)
          : null,
      };
    });
  }

  async getProgress(userId: string, id: string) {
    const { quranJuz } = await this.getKhatma(userId, id);
    return {
      completedJuz: quranJuz.filter((juz) => juz.status === 'completed').length,
      selectedJuz: quranJuz
        .filter(
          (juz) =>
            juz.status === 'claimed' && juz.claimedBy?.toString() === userId,
        )
        .map((juz) => juz.juzNumber),
    };
  }

  // --------------------------------------------------------------- commands

  claim(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'claim');
  }

  release(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'release');
  }

  complete(userId: string, id: string, juzNumber: number) {
    return this.applyAction(userId, id, juzNumber, 'complete');
  }

  private async applyAction(
    userId: string,
    id: string,
    juzNumber: number,
    action: 'claim' | 'release' | 'complete',
  ) {
    // Gives a clean 404/403 and guarantees quranJuz is seeded before the positional update below.
    await this.getKhatma(userId, id);

    const now = new Date();
    const heldJuz = { juzNumber, status: 'claimed', claimedBy: userId } as const;
    const filter = action === 'claim'
      ? { _id: id, ...QURAN, status: 'active', 'members.userId': userId, quranJuz: { $elemMatch: { juzNumber, status: 'free' } } } as const
      : { _id: id, ...QURAN, status: 'active', 'members.userId': userId, quranJuz: { $elemMatch: heldJuz } } as const;
    const update = action === 'claim'
      ? { $set: { 'quranJuz.$[juz].status': 'claimed', 'quranJuz.$[juz].claimedBy': userId, 'quranJuz.$[juz].claimedAt': now } }
      : action === 'release'
        ? { $set: { 'quranJuz.$[juz].status': 'free', 'quranJuz.$[juz].claimedBy': null, 'quranJuz.$[juz].claimedAt': null } }
        : { $set: { 'quranJuz.$[juz].status': 'completed', 'quranJuz.$[juz].completedAt': now } };
    const result = await this.khatmas
      .updateOne(filter, update, { arrayFilters: [{ 'juz.juzNumber': juzNumber }] })
      .exec();

    if (result.modifiedCount !== 1) throw new ConflictException(action === 'claim' ? 'Juz is unavailable' : 'You do not hold this Juz');

    this.realtime.publish(id, 'progressChanged');
    if (action === 'complete') await this.completeKhatmaIfFinished(id, now);

    return null;
  }

  /** Flips the Khatma to completed once every Juz is completed. Safe to call repeatedly. */
  private async completeKhatmaIfFinished(id: string, now: Date) {
    const result = await this.khatmas
      .updateOne(
        {
          _id: id,
          ...QURAN,
          status: 'active',
          quranJuz: { $not: { $elemMatch: { status: { $ne: 'completed' } } } },
        },
        [
          {
            $set: {
              status: 'completed',
              completedAt: { $ifNull: ['$completedAt', now] },
            },
          },
        ],
        { updatePipeline: true },
      )
      .exec();

    if (result.modifiedCount === 1) this.realtime.publish(id, 'completed');
  }

  // ---------------------------------------------------------------- helpers

  private async loadDisplayNames(userIds: string[]) {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map<string, string>();

    const users = await this.users
      .find({ _id: { $in: unique } })
      .select('_id displayName')
      .lean()
      .exec();
    return new Map(
      users.map((user) => [
        user._id.toString(),
        user.displayName || UNKNOWN_MEMBER,
      ]),
    );
  }

  /** Loads the Khatma for a member, lazily seeding the 30 Juz on first access. */
  private async getKhatma(userId: string, id: string): Promise<QuranKhatma> {
    const khatma = await this.khatmas
      .findOne({ _id: id, ...QURAN, 'members.userId': userId })
      .exec();

    if (!khatma) {
      const exists = await this.khatmas.exists({ _id: id, ...QURAN });
      if (exists)
        throw new ForbiddenException(
          'Only Khatma members can view Quran progress',
        );
      throw new NotFoundException('Quran Khatma not found');
    }

    const count = khatma.quranJuz?.length ?? 0;
    if (count === JUZ_COUNT) return khatma as QuranKhatma;
    if (count > 0)
      throw new ConflictException('Quran Khatma progress is invalid');

    // The filter makes concurrent seeding idempotent: only the first writer matches.
    await this.khatmas
      .updateOne(
        {
          _id: id,
          ...QURAN,
          $or: [{ quranJuz: { $exists: false } }, { quranJuz: { $size: 0 } }],
        },
        {
          $set: {
            quranJuz: Array.from({ length: JUZ_COUNT }, (_, index) => ({
              juzNumber: index + 1,
            })),
          },
        },
      )
      .exec();

    const seeded = await this.khatmas.findById(id).exec();
    if (seeded?.quranJuz?.length !== JUZ_COUNT)
      throw new ConflictException('Quran Khatma progress is invalid');
    return seeded as QuranKhatma;
  }
}
