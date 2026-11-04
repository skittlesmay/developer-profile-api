import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProfessionalLink {
  @Field(() => String)
  label!: string;

  @Field(() => String)
  url!: string;
}

@ObjectType()
export class Skill {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  category!: string | null;
}

@ObjectType()
export class Experience {
  @Field(() => String)
  company!: string;

  @Field(() => String)
  position!: string;

  @Field(() => String)
  startMonth!: string;

  @Field(() => String, { nullable: true })
  endMonth!: string | null;

  @Field(() => [String])
  achievements!: string[];
}

@ObjectType()
export class Project {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  url!: string;
}

@ObjectType()
export class Profile {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => [ProfessionalLink])
  links!: ProfessionalLink[];

  @Field(() => [Skill])
  skills!: Skill[];

  @Field(() => [Experience])
  experience!: Experience[];

  @Field(() => [Project])
  projects!: Project[];
}
