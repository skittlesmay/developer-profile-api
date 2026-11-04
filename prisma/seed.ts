import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { env } from 'prisma/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedData, type SeedData } from './seed-data';

export function validateSeedData(data: SeedData): void {
  if (!data.profile.id.trim()) {
    throw new Error('Profile ID must not be empty');
  }

  const ids = new Set([data.profile.id]);
  for (const rows of [
    data.links,
    data.skills,
    data.experience,
    data.projects,
  ]) {
    const sortOrders = new Set<number>();
    for (const row of rows) {
      if (!row.id.trim() || ids.has(row.id)) {
        throw new Error('Seed IDs must be nonempty and unique');
      }
      ids.add(row.id);
      if (row.profileId !== data.profile.id) {
        throw new Error('Seed rows must belong to the seeded profile');
      }
      if (
        !Number.isInteger(row.sortOrder) ||
        row.sortOrder < 0 ||
        row.sortOrder > 2_147_483_647 ||
        sortOrders.has(row.sortOrder)
      ) {
        throw new Error(
          'Sort orders must be unique nonnegative PostgreSQL integers',
        );
      }
      sortOrders.add(row.sortOrder);
    }
  }

  for (const { url } of [...data.links, ...data.projects]) {
    if (!URL.canParse(url)) {
      throw new Error('Seed URLs must be valid HTTP(S) URLs');
    }
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('Seed URLs must be valid HTTP(S) URLs');
    }
  }

  const month = /^\d{4}-(0[1-9]|1[0-2])$/;
  for (const { startMonth, endMonth } of data.experience) {
    if (
      !month.test(startMonth) ||
      (endMonth !== null && (!month.test(endMonth) || endMonth < startMonth))
    ) {
      throw new Error(
        'Experience months must use YYYY-MM in chronological order',
      );
    }
  }
}

export async function seedProfile(
  prisma: PrismaClient,
  data: SeedData,
): Promise<void> {
  validateSeedData(data);

  await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { id: data.profile.id },
      create: data.profile,
      update: data.profile,
    });
    const where = { profileId: data.profile.id };
    await tx.professionalLink.deleteMany({ where });
    await tx.skill.deleteMany({ where });
    await tx.experience.deleteMany({ where });
    await tx.project.deleteMany({ where });
    await tx.professionalLink.createMany({ data: data.links });
    await tx.skill.createMany({ data: data.skills });
    await tx.experience.createMany({ data: data.experience });
    await tx.project.createMany({ data: data.projects });
  });
}

async function main(): Promise<void> {
  config({ quiet: true });
  const adapter = new PrismaPg({ connectionString: env('DATABASE_URL') });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedProfile(prisma, seedData);
    console.info('Developer profile seeded');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error('Developer profile seed failed');
    process.exitCode = 1;
  });
}
