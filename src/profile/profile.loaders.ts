import DataLoader from 'dataloader';
import type { PrismaService } from '../database/prisma.service';
import type {
  ExperienceModel,
  ProfessionalLinkModel,
  ProjectModel,
  SkillModel,
} from '../generated/prisma/models';

export type ProfileLoaders = {
  links: DataLoader<string, ProfessionalLinkModel[]>;
  skills: DataLoader<string, SkillModel[]>;
  experience: DataLoader<string, ExperienceModel[]>;
  projects: DataLoader<string, ProjectModel[]>;
};

function groupByProfileIds<T extends { profileId: string }>(
  profileIds: readonly string[],
  rows: T[],
): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.profileId);
    if (group) {
      group.push(row);
    } else {
      groups.set(row.profileId, [row]);
    }
  }
  return profileIds.map((id) => groups.get(id) ?? []);
}

export function createProfileLoaders(prisma: PrismaService): ProfileLoaders {
  return {
    links: new DataLoader<string, ProfessionalLinkModel[]>(
      async (profileIds) => {
        const rows = await prisma.professionalLink.findMany({
          where: { profileId: { in: [...profileIds] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        return groupByProfileIds(profileIds, rows);
      },
    ),
    skills: new DataLoader<string, SkillModel[]>(async (profileIds) => {
      const rows = await prisma.skill.findMany({
        where: { profileId: { in: [...profileIds] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      return groupByProfileIds(profileIds, rows);
    }),
    experience: new DataLoader<string, ExperienceModel[]>(
      async (profileIds) => {
        const rows = await prisma.experience.findMany({
          where: { profileId: { in: [...profileIds] } },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        return groupByProfileIds(profileIds, rows);
      },
    ),
    projects: new DataLoader<string, ProjectModel[]>(async (profileIds) => {
      const rows = await prisma.project.findMany({
        where: { profileId: { in: [...profileIds] } },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      return groupByProfileIds(profileIds, rows);
    }),
  };
}
