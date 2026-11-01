import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { PaginationQueryDto } from '../common/pagination.dto.js';
import { paginatedResponse } from '../common/paginated-response.js';
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

  async list(
    userId: string,
    query: { status: 'active' | 'completed'; type: 'quran' | 'zikr' } & PaginationQueryDto,
  ) {
    const memberId = new Types.ObjectId(userId);
    const offset = (query.page - 1) * query.perPage;
    const [result] = await this.khatmas.aggregate<{
      data: Array<{
        _id: Types.ObjectId;
        name: string;
        type: 'quran' | 'zikr';
        completedAt: Date | null;
        memberCount: number;
      }>;
      total: Array<{ count: number }>;
    }>([
      { $match: { 'members.userId': memberId, status: query.status, type: query.type } },
      {
        $addFields: {
          joinedAt: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: '$members',
                      as: 'member',
                      cond: { $eq: ['$$member.userId', memberId] },
                    },
                  },
                  as: 'member',
                  in: '$$member.joinedAt',
                },
              },
              0,
            ],
          },
        },
      },
      { $sort: { joinedAt: 1, _id: 1 } },
      {
        $facet: {
          data: [
            { $skip: offset },
            { $limit: query.perPage },
            {
              $project: {
                _id: 1,
                name: 1,
                type: 1,
                completedAt: 1,
                memberCount: { $size: '$members' },
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]).exec();
    const rows = result?.data ?? [];
    const data = rows.map((khatma) =>
      query.status === 'active'
        ? {
            id: khatma._id.toString(),
            name: khatma.name,
            type: khatma.type,
            memberCount: khatma.memberCount,
          }
        : {
            id: khatma._id.toString(),
            name: khatma.name,
            type: khatma.type,
            completedAt: khatma.completedAt?.toISOString() ?? '',
          },
    );
    return paginatedResponse(data, query.page, query.perPage, result?.total[0]?.count ?? 0);
  }

  async members(userId: string, id: string, pagination: PaginationQueryDto) {
    const khatma = await this.getMemberKhatma(userId, id);
    const members = [...khatma.members].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
    const offset = (pagination.page - 1) * pagination.perPage;
    const pageMembers = members.slice(offset, offset + pagination.perPage);
    const userIds = pageMembers.map((member) => member.userId);
    const users = await this.users.find({ _id: { $in: userIds } }).select('_id displayName').lean().exec();
    const names = new Map(users.map((user) => [user._id.toString(), user.displayName || null]));
    const data = pageMembers.map((member) => ({
      userId: member.userId.toString(),
      displayName: names.get(member.userId.toString()) ?? null,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    }));
    return paginatedResponse(data, pagination.page, pagination.perPage, members.length);
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
