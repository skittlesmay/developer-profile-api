import { Test } from '@nestjs/testing';
import { seedData } from '../../prisma/seed-data';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { createProfileLoaders, type ProfileLoaders } from './profile.loaders';

function describeLoader<
  T extends { id: string; profileId: string; sortOrder: number },
>(
  name: keyof ProfileLoaders,
  model: 'professionalLink' | 'skill' | 'experience' | 'project',
  rows: T[],
): void {
  describe(`Profile ${name} loader`, () => {
    const mocks = {
      professionalLink: jest.fn<
        Promise<T[]>,
        [Prisma.ProfessionalLinkFindManyArgs]
      >(),
      skill: jest.fn<Promise<T[]>, [Prisma.SkillFindManyArgs]>(),
      experience: jest.fn<Promise<T[]>, [Prisma.ExperienceFindManyArgs]>(),
      project: jest.fn<Promise<T[]>, [Prisma.ProjectFindManyArgs]>(),
    };
    const findMany = mocks[model];
    let prisma: PrismaService;

    beforeEach(async () => {
      for (const mock of Object.values(mocks)) {
        mock.mockReset();
        mock.mockResolvedValue([]);
      }
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: PrismaService,
            useValue: {
              professionalLink: { findMany: mocks.professionalLink },
              skill: { findMany: mocks.skill },
              experience: { findMany: mocks.experience },
              project: { findMany: mocks.project },
            },
          },
        ],
      }).compile();
      prisma = moduleRef.get(PrismaService);
    });

    it('does not fetch relations when loaders are created', () => {
      createProfileLoaders(prisma);
      for (const mock of Object.values(mocks)) {
        expect(mock).not.toHaveBeenCalled();
      }
    });

    it('batches parent IDs, preserves row/key order and returns empty arrays for unknown IDs', async () => {
      const first = { ...rows[0], sortOrder: 0 };
      const last = { ...rows[1], sortOrder: 1 };
      const other = {
        ...first,
        id: `${first.id}-second-profile`,
        profileId: 'second-profile',
      };
      findMany.mockResolvedValue([first, other, last]);
      const loader = createProfileLoaders(prisma)[name];

      const result = await Promise.all([
        loader.load(other.profileId),
        loader.load(first.profileId),
        loader.load('missing-profile'),
      ]);

      expect(result).toEqual([[other], [first, last], []]);
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({
        where: {
          profileId: {
            in: [other.profileId, first.profileId, 'missing-profile'],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      for (const [delegate, mock] of Object.entries(mocks)) {
        if (delegate !== model) expect(mock).not.toHaveBeenCalled();
      }
    });

    it('caches repeated keys before and after the batch resolves', async () => {
      findMany.mockResolvedValue([rows[0]]);
      const loader = createProfileLoaders(prisma)[name];
      const [first, repeated] = await Promise.all([
        loader.load(rows[0].profileId),
        loader.load(rows[0].profileId),
      ]);

      expect(first).toEqual([rows[0]]);
      expect(repeated).toBe(first);
      expect(await loader.load(rows[0].profileId)).toBe(first);
      expect(findMany).toHaveBeenCalledTimes(1);
    });

    it('uses independent caches for separate loader factories', async () => {
      const updated = { ...rows[0], id: `${rows[0].id}-updated` };
      findMany
        .mockResolvedValueOnce([rows[0]])
        .mockResolvedValueOnce([updated]);
      const first = createProfileLoaders(prisma)[name];
      const second = createProfileLoaders(prisma)[name];

      expect(first).not.toBe(second);
      expect(await first.load(rows[0].profileId)).toEqual([rows[0]]);
      expect(await second.load(rows[0].profileId)).toEqual([updated]);
      expect(await first.load(rows[0].profileId)).toEqual([rows[0]]);
      expect(findMany).toHaveBeenCalledTimes(2);
    });

    it('propagates batch failures and allows a subsequent retry', async () => {
      const error = new Error('Database unavailable');
      findMany.mockRejectedValueOnce(error).mockResolvedValueOnce([rows[0]]);
      const loader = createProfileLoaders(prisma)[name];
      const result = await Promise.allSettled([
        loader.load(rows[0].profileId),
        loader.load('second-profile'),
      ]);

      expect(result).toEqual([
        { status: 'rejected', reason: error },
        { status: 'rejected', reason: error },
      ]);
      expect(await loader.load(rows[0].profileId)).toEqual([rows[0]]);
      expect(findMany).toHaveBeenCalledTimes(2);
    });
  });
}

describeLoader('links', 'professionalLink', seedData.links);
describeLoader('skills', 'skill', seedData.skills);
describeLoader('experience', 'experience', seedData.experience);
describeLoader('projects', 'project', seedData.projects);
