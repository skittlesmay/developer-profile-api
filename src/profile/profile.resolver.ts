import {
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type {
  ExperienceModel as ExperienceRecord,
  ProfessionalLinkModel as ProfessionalLinkRecord,
  ProjectModel as ProjectRecord,
  SkillModel as SkillRecord,
} from '../generated/prisma/models';
import type { GraphQLContext } from './profile.context';
import { ProfileService, type ProfileRecord } from './profile.service';
import {
  Experience,
  ProfessionalLink,
  Profile,
  Project,
  Skill,
} from './profile.types';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => Profile, { nullable: true })
  profile(): Promise<ProfileRecord | null> {
    return this.profileService.findPublicProfile();
  }

  @ResolveField(() => [ProfessionalLink])
  links(
    @Parent() profile: ProfileRecord,
    @Context() context: GraphQLContext,
  ): Promise<ProfessionalLinkRecord[]> {
    return context.loaders.links.load(profile.id);
  }

  @ResolveField(() => [Skill])
  skills(
    @Parent() profile: ProfileRecord,
    @Context() context: GraphQLContext,
  ): Promise<SkillRecord[]> {
    return context.loaders.skills.load(profile.id);
  }

  @ResolveField(() => [Experience])
  experience(
    @Parent() profile: ProfileRecord,
    @Context() context: GraphQLContext,
  ): Promise<ExperienceRecord[]> {
    return context.loaders.experience.load(profile.id);
  }

  @ResolveField(() => [Project])
  projects(
    @Parent() profile: ProfileRecord,
    @Context() context: GraphQLContext,
  ): Promise<ProjectRecord[]> {
    return context.loaders.projects.load(profile.id);
  }
}
