import { Test } from '@nestjs/testing';
import DataLoader from 'dataloader';
import { seedData } from '../../prisma/seed-data';
import type { GraphQLContext } from './profile.context';
import { ProfileResolver } from './profile.resolver';
import { ProfileService, type ProfileRecord } from './profile.service';

describe('ProfileResolver', () => {
  const findPublicProfile = jest.fn<Promise<ProfileRecord | null>, []>();
  let resolver: ProfileResolver;

  beforeEach(async () => {
    findPublicProfile.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileResolver,
        { provide: ProfileService, useValue: { findPublicProfile } },
      ],
    }).compile();
    resolver = moduleRef.get(ProfileResolver);
  });

  it('delegates the root query to ProfileService', async () => {
    findPublicProfile.mockResolvedValue(seedData.profile);
    await expect(resolver.profile()).resolves.toEqual(seedData.profile);
    expect(findPublicProfile).toHaveBeenCalledTimes(1);
    expect(findPublicProfile).toHaveBeenCalledWith();
  });

  it('returns null when the service reports a missing profile', async () => {
    findPublicProfile.mockResolvedValue(null);
    await expect(resolver.profile()).resolves.toBeNull();
  });

  it('propagates failures from the profile service', async () => {
    const error = new Error('Database unavailable');
    findPublicProfile.mockRejectedValue(error);
    await expect(resolver.profile()).rejects.toBe(error);
  });

  it.each(['links', 'skills', 'experience', 'projects'] as const)(
    'loads only %s using the parent ID and the supplied request context',
    async (relation) => {
      const context: GraphQLContext = {
        loaders: {
          links: new DataLoader<string, typeof seedData.links>((ids) =>
            Promise.resolve(ids.map(() => seedData.links)),
          ),
          skills: new DataLoader<string, typeof seedData.skills>((ids) =>
            Promise.resolve(ids.map(() => seedData.skills)),
          ),
          experience: new DataLoader<string, typeof seedData.experience>(
            (ids) => Promise.resolve(ids.map(() => seedData.experience)),
          ),
          projects: new DataLoader<string, typeof seedData.projects>((ids) =>
            Promise.resolve(ids.map(() => seedData.projects)),
          ),
        },
      };
      const spies = {
        links: jest.spyOn(context.loaders.links, 'load'),
        skills: jest.spyOn(context.loaders.skills, 'load'),
        experience: jest.spyOn(context.loaders.experience, 'load'),
        projects: jest.spyOn(context.loaders.projects, 'load'),
      };

      await expect(
        resolver[relation](seedData.profile, context),
      ).resolves.toEqual(seedData[relation]);
      expect(spies[relation]).toHaveBeenCalledTimes(1);
      expect(spies[relation]).toHaveBeenCalledWith(seedData.profile.id);
      for (const [name, spy] of Object.entries(spies)) {
        if (name !== relation) expect(spy).not.toHaveBeenCalled();
      }
      expect(findPublicProfile).not.toHaveBeenCalled();
    },
  );

  it('propagates a relation loader failure', async () => {
    const error = new Error('Relation unavailable');
    const context: GraphQLContext = {
      loaders: {
        links: new DataLoader<string, typeof seedData.links>(() =>
          Promise.reject(error),
        ),
        skills: new DataLoader<string, typeof seedData.skills>(() =>
          Promise.reject(error),
        ),
        experience: new DataLoader<string, typeof seedData.experience>(() =>
          Promise.reject(error),
        ),
        projects: new DataLoader<string, typeof seedData.projects>(() =>
          Promise.reject(error),
        ),
      },
    };
    await expect(resolver.skills(seedData.profile, context)).rejects.toBe(
      error,
    );
  });
});
