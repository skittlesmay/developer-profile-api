import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ProfileModel } from '../generated/prisma/models';

export type ProfileRecord = Pick<ProfileModel, 'id' | 'name' | 'description'>;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  findPublicProfile(): Promise<ProfileRecord | null> {
    return this.prisma.profile.findUnique({
      where: { id: 'platon-savushkin' },
      select: { id: true, name: true, description: true },
    });
  }
}
