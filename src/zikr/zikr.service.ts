import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { Khatma } from '../khatmas/khatma.schema.js';
import { RealtimeService } from '../realtime/realtime.service.js';

@Injectable()
export class ZikrService {
  constructor(@InjectModel(Khatma.name) private readonly khatmas: Model<Khatma>, private readonly realtime: RealtimeService) {}

  async getProgress(userId: string, id: string) {
    const khatma = await this.getKhatma(userId, id);
    const pendingCount = khatma.zikrClaims!.reduce((sum, claim) => sum + claim.amount, 0);
    return {
      phrase: khatma.zikrPhrase,
      goalCount: khatma.zikrGoalCount,
      completedCount: khatma.zikrCompletedCount,
      pendingCount,
      myPendingCount: khatma.zikrClaims!.find((claim) => claim.userId.toString() === userId)?.amount ?? 0,
    };
  }

  async setClaim(userId: string, id: string, amount: number) {
    await this.getKhatma(userId, id);
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.khatmas.updateOne(
      {
        _id: id, type: 'zikr', status: 'active', 'members.userId': userObjectId,
        $expr: { $lte: [{ $add: ['$zikrCompletedCount', { $sum: { $map: { input: { $filter: { input: '$zikrClaims', as: 'claim', cond: { $ne: ['$$claim.userId', userObjectId] } } }, as: 'claim', in: '$$claim.amount' } } }, amount] }, '$zikrGoalCount'] },
      },
      [{ $set: { zikrClaims: { $cond: [
        { $in: [userObjectId, { $map: { input: '$zikrClaims', as: 'claim', in: '$$claim.userId' } }] },
        { $map: { input: '$zikrClaims', as: 'claim', in: { $cond: [{ $eq: ['$$claim.userId', userObjectId] }, { userId: '$$claim.userId', amount }, '$$claim'] } } },
        { $concatArrays: ['$zikrClaims', [{ userId: userObjectId, amount }]] },
      ] } } }],
      { updatePipeline: true },
    ).exec();
    if (result.matchedCount !== 1) throw new ConflictException('Claim exceeds the remaining goal');
    this.realtime.publish(id, 'progressChanged');
    return null;
  }

  async releaseClaim(userId: string, id: string) {
    const khatma = await this.getKhatma(userId, id);
    if (!khatma.zikrClaims!.some((claim) => claim.userId.toString() === userId)) throw new ConflictException('You have no pending claim');
    const result = await this.khatmas.updateOne(
      { _id: id, type: 'zikr', status: 'active', 'members.userId': userId, 'zikrClaims.userId': userId },
      { $pull: { zikrClaims: { userId } } },
    ).exec();
    if (result.modifiedCount !== 1) throw new ConflictException('You have no pending claim');
    this.realtime.publish(id, 'progressChanged');
    return null;
  }

  async completeClaim(userId: string, id: string) {
    await this.getKhatma(userId, id);
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.khatmas.updateOne(
      { _id: id, type: 'zikr', status: 'active', 'members.userId': userObjectId, 'zikrClaims.userId': userObjectId },
      [
        { $set: {
          zikrCompletedCount: {
            $add: [
              '$zikrCompletedCount',
              {
                $let: {
                  vars: {
                    claim: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$zikrClaims',
                            as: 'claim',
                            cond: { $eq: ['$$claim.userId', userObjectId] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: '$$claim.amount',
                },
              },
            ],
          },
          zikrClaims: { $filter: { input: '$zikrClaims', as: 'claim', cond: { $ne: ['$$claim.userId', userObjectId] } } },
        } },
        { $set: { status: { $cond: [{ $gte: ['$zikrCompletedCount', '$zikrGoalCount'] }, 'completed', 'active'] }, completedAt: { $cond: [{ $gte: ['$zikrCompletedCount', '$zikrGoalCount'] }, { $ifNull: ['$completedAt', new Date()] }, '$completedAt'] } } },
      ],
      { updatePipeline: true },
    ).exec();
    if (result.modifiedCount !== 1) throw new ConflictException('You have no pending claim');
    this.realtime.publish(id, 'progressChanged');
    const completed = await this.khatmas.exists({ _id: id, status: 'completed' });
    if (completed) this.realtime.publish(id, 'completed');
    return null;
  }

  async updateSettings(userId: string, id: string, phrase: string, goalCount: number) {
    const khatma = await this.getKhatma(userId, id);
    if (khatma.createdBy.toString() !== userId) throw new ForbiddenException('Only the owner can update Zikr settings');
    if (goalCount < khatma.zikrGoalCount!) throw new ConflictException('Goal cannot be decreased');
    const result = await this.khatmas.updateOne(
      { _id: id, type: 'zikr', status: 'active', createdBy: userId, zikrGoalCount: { $lte: goalCount } },
      { $set: { zikrPhrase: phrase, zikrGoalCount: goalCount } },
    ).exec();
    if (result.matchedCount !== 1) throw new ConflictException('Zikr Khatma settings cannot be updated');
    this.realtime.publish(id, 'progressChanged');
    return null;
  }

  private async getKhatma(userId: string, id: string) {
    const khatma = await this.khatmas.findOne({ _id: id, type: 'zikr', 'members.userId': userId }).exec();
    if (!khatma) {
      if (await this.khatmas.exists({ _id: id, type: 'zikr' })) throw new ForbiddenException('Only Khatma members can view Zikr progress');
      throw new NotFoundException('Zikr Khatma not found');
    }
    if (!khatma.zikrPhrase || !khatma.zikrGoalCount || khatma.zikrCompletedCount == null || !Array.isArray(khatma.zikrClaims)) {
      throw new ConflictException('Zikr Khatma progress is invalid');
    }
    return khatma;
  }
}
