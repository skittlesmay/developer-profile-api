import { Test } from '@nestjs/testing';
import { seedData } from '../../prisma/seed-data';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { ProfileService, type ProfileRecord } from './profile.service';

describe('ProfileService', () => {
  const findUnique = jest.fn<
    Promise<ProfileRecord | null>,
    [Prisma.ProfileFindUniqueArgs]
  >();
  let service: ProfileService;

  beforeEach(async () => {
    findUnique.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: { profile: { findUnique } } },
      ],
    }).compile();
    service = moduleRef.get(ProfileService);
  });

  it('selects only public scalar fields for the seeded profile', async () => {
    findUnique.mockResolvedValue(seedData.profile);

    await expect(service.findPublicProfile()).resolves.toEqual(
      seedData.profile,
    );
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'platon-savushkin' },
      select: { id: true, name: true, description: true },
    });
  });

  it('returns null when the profile has not been seeded', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.findPublicProfile()).resolves.toBeNull();
  });

  it('propagates database failures instead of reporting a missing profile', async () => {
    const error = new Error('Database unavailable');
    findUnique.mockRejectedValue(error);
    await expect(service.findPublicProfile()).rejects.toBe(error);
  });
});
