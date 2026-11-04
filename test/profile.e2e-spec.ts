import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { seedData } from '../prisma/seed-data';
import { seedProfile } from '../prisma/seed';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { createProfileLoaders } from '../src/profile/profile.loaders';
import type { Profile } from '../src/profile/profile.types';

function trackQueries(prisma: PrismaService) {
  return {
    profile: jest.spyOn(prisma.profile, 'findUnique'),
    links: jest.spyOn(prisma.professionalLink, 'findMany'),
    skills: jest.spyOn(prisma.skill, 'findMany'),
    experience: jest.spyOn(prisma.experience, 'findMany'),
    projects: jest.spyOn(prisma.project, 'findMany'),
  };
}

describe('Profile GraphQL API (e2e)', () => {
  const relations = ['links', 'skills', 'experience', 'projects'] as const;
  const expected: Profile = {
    ...seedData.profile,
    links: seedData.links.map(({ label, url }) => ({ label, url })),
    skills: seedData.skills.map(({ name, category }) => ({ name, category })),
    experience: seedData.experience.map(
      ({ company, position, startMonth, endMonth, achievements }) => ({
        company,
        position,
        startMonth,
        endMonth,
        achievements,
      }),
    ),
    projects: seedData.projects.map(({ name, description, url }) => ({
      name,
      description,
      url,
    })),
  };
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let calls: ReturnType<typeof trackQueries>;
  let endpoint: string;

  beforeAll(async () => {
    execFileSync(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      {
        cwd: resolve(__dirname, '..'),
        env: process.env,
        stdio: 'pipe',
        timeout: 30000,
      },
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string')
      throw new Error('Expected an HTTP test port');
    endpoint = `http://127.0.0.1:${address.port}/graphql`;
    prisma = app.get(PrismaService);
    await seedProfile(prisma, seedData);
    calls = trackQueries(prisma);
  });

  beforeEach(() => {
    if (calls) for (const spy of Object.values(calls)) spy.mockClear();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (app) await app.close();
  });

  async function execute(query: string): Promise<unknown> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    return body;
  }

  it('reads only the root profile for a scalar query', async () => {
    expect(await execute('{ profile { name } }')).toEqual({
      data: { profile: { name: expected.name } },
    });
    expect(calls.profile).toHaveBeenCalledTimes(1);
    for (const relation of relations)
      expect(calls[relation]).not.toHaveBeenCalled();
  });

  it.each([
    ['links', 'label url'],
    ['skills', 'name category'],
    ['experience', 'company position startMonth endMonth achievements'],
    ['projects', 'name description url'],
  ] as const)('loads only %s in display order', async (relation, fields) => {
    expect(await execute(`{ profile { ${relation} { ${fields} } } }`)).toEqual({
      data: { profile: { [relation]: expected[relation] } },
    });
    expect(calls.profile).toHaveBeenCalledTimes(1);
    for (const name of relations)
      expect(calls[name]).toHaveBeenCalledTimes(name === relation ? 1 : 0);
  });

  it('returns the full public card with one fetch per relation', async () => {
    const query = `query ProfileCard {
      profile {
        id name description
        links { label url }
        skills { name category }
        experience { company position startMonth endMonth achievements }
        projects { name description url }
      }
    }`;
    expect(await execute(query)).toEqual({ data: { profile: expected } });
    expect(calls.profile).toHaveBeenCalledTimes(1);
    for (const relation of relations)
      expect(calls[relation]).toHaveBeenCalledTimes(1);
  });

  it('shares the loader cache between aliases in the same request', async () => {
    expect(
      await execute(
        '{ first: profile { skills { name category } } second: profile { skills { name category } } }',
      ),
    ).toEqual({
      data: {
        first: { skills: expected.skills },
        second: { skills: expected.skills },
      },
    });
    expect(calls.profile).toHaveBeenCalledTimes(2);
    expect(calls.skills).toHaveBeenCalledTimes(1);
    for (const relation of ['links', 'experience', 'projects'] as const)
      expect(calls[relation]).not.toHaveBeenCalled();
  });

  it('does not share loader caches between HTTP requests', async () => {
    for (let i = 0; i < 2; i++) {
      expect(await execute('{ profile { skills { name category } } }')).toEqual(
        { data: { profile: { skills: expected.skills } } },
      );
    }
    expect(calls.profile).toHaveBeenCalledTimes(2);
    expect(calls.skills).toHaveBeenCalledTimes(2);
  });

  it.each(relations)(
    'batches two parent IDs into one real %s fetch',
    async (relation) => {
      const loaders = createProfileLoaders(prisma);
      const values = await Promise.all([
        loaders[relation].load(seedData.profile.id),
        loaders[relation].load(`missing-${randomUUID()}`),
      ]);
      expect(values).toEqual([seedData[relation], []]);
      expect(calls[relation]).toHaveBeenCalledTimes(1);
      expect(calls.profile).not.toHaveBeenCalled();
      for (const name of relations)
        if (name !== relation) expect(calls[name]).not.toHaveBeenCalled();
    },
  );

  it('exposes introspection without a mutation root', async () => {
    expect(
      await execute(
        '{ __schema { queryType { name } mutationType { name } } }',
      ),
    ).toEqual({
      data: { __schema: { queryType: { name: 'Query' }, mutationType: null } },
    });
    for (const spy of Object.values(calls)) expect(spy).not.toHaveBeenCalled();
  });

  it('preserves all child IDs and values after a repeated seed', async () => {
    const relation = { orderBy: { id: 'asc' as const } };
    const read = () =>
      prisma.profile.findUniqueOrThrow({
        where: { id: seedData.profile.id },
        include: {
          links: relation,
          skills: relation,
          experience: relation,
          projects: relation,
        },
      });
    const before = await read();
    await seedProfile(prisma, seedData);
    expect(await read()).toEqual(before);
    expect([
      before.links.length,
      before.skills.length,
      before.experience.length,
      before.projects.length,
    ]).toEqual([2, 20, 3, 8]);
  });

  it('returns null for an unseeded database and restores the test profile', async () => {
    await prisma.profile.deleteMany({ where: { id: seedData.profile.id } });
    try {
      expect(await execute('{ profile { name skills { name } } }')).toEqual({
        data: { profile: null },
      });
      for (const relation of relations)
        expect(calls[relation]).not.toHaveBeenCalled();
    } finally {
      await seedProfile(prisma, seedData);
    }
  });
});
