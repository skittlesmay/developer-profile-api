import { seedData } from './seed-data';
import { validateSeedData } from './seed';

describe('Profile seed data', () => {
  it('contains the confirmed profile and professional links', () => {
    expect(seedData.profile.id).toBe('platon-savushkin');
    expect(seedData.profile.name).toBe('Платон Савушкин');
    expect(seedData.links.map(({ url }) => url)).toEqual([
      'https://github.com/skittlesmay',
      'https://t.me/platonsavushkin',
    ]);
    expect(Object.keys(seedData.profile).sort()).toEqual([
      'description',
      'id',
      'name',
    ]);
  });

  it('contains the twenty selected skills from the CV in display order', () => {
    expect(seedData.skills.map(({ name }) => name)).toEqual([
      'TypeScript',
      'Node.js',
      'NestJS',
      'GraphQL',
      'REST API',
      'Express',
      'PostgreSQL',
      'Prisma ORM',
      'Redis',
      'Docker',
      'Docker Compose',
      'S3',
      'MinIO',
      'BullMQ',
      'RabbitMQ',
      'WebSocket',
      'Socket.IO',
      'React',
      'Next.js',
      'Python',
    ]);
    expect(seedData.experience).toHaveLength(3);
    expect(seedData.projects).toHaveLength(8);
  });

  it('accepts the complete seed data', () => {
    expect(() => validateSeedData(seedData)).not.toThrow();
  });

  it('rejects duplicate IDs', () => {
    const data = structuredClone(seedData);
    data.skills[1].id = data.skills[0].id;
    expect(() => validateSeedData(data)).toThrow(
      'Seed IDs must be nonempty and unique',
    );
  });

  it('rejects duplicate sort orders within a relation', () => {
    const data = structuredClone(seedData);
    data.projects[1].sortOrder = data.projects[0].sortOrder;
    expect(() => validateSeedData(data)).toThrow('Sort orders must be unique');
  });

  it.each([-1, 0.5, 2_147_483_648])(
    'rejects invalid sortOrder=%s',
    (sortOrder) => {
      const data = structuredClone(seedData);
      data.skills[0].sortOrder = sortOrder;
      expect(() => validateSeedData(data)).toThrow(
        'Sort orders must be unique',
      );
    },
  );

  it('rejects rows associated with another profile', () => {
    const data = structuredClone(seedData);
    data.links[0].profileId = 'another-profile';
    expect(() => validateSeedData(data)).toThrow(
      'Seed rows must belong to the seeded profile',
    );
  });

  it.each(['not-a-url', 'javascript:alert(1)'])('rejects URL=%s', (url) => {
    const data = structuredClone(seedData);
    data.projects[0].url = url;
    expect(() => validateSeedData(data)).toThrow(
      'Seed URLs must be valid HTTP(S) URLs',
    );
  });

  it.each(['2023-00', '2023-13', '2023-09-01'])(
    'rejects startMonth=%s',
    (startMonth) => {
      const data = structuredClone(seedData);
      data.experience[0].startMonth = startMonth;
      expect(() => validateSeedData(data)).toThrow(
        'Experience months must use YYYY-MM',
      );
    },
  );

  it('rejects an end month preceding the start month', () => {
    const data = structuredClone(seedData);
    data.experience[0].endMonth = '2023-08';
    expect(() => validateSeedData(data)).toThrow(
      'Experience months must use YYYY-MM',
    );
  });
});
