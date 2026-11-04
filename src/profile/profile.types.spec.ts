import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { isObjectType } from 'graphql';
import { ProfileResolver } from './profile.resolver';

describe('Profile GraphQL types', () => {
  it('exposes exactly the public fields with the required nullability', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();

    try {
      const schema = await moduleRef
        .get(GraphQLSchemaFactory)
        .create([ProfileResolver]);
      expect(schema.getQueryType()?.getFields().profile.type.toString()).toBe(
        'Profile',
      );
      expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual([
        'profile',
      ]);
      expect(schema.getMutationType()).toBeUndefined();
      const expected = {
        Profile: {
          id: 'ID!',
          name: 'String!',
          description: 'String!',
          links: '[ProfessionalLink!]!',
          skills: '[Skill!]!',
          experience: '[Experience!]!',
          projects: '[Project!]!',
        },
        ProfessionalLink: { label: 'String!', url: 'String!' },
        Skill: { name: 'String!', category: 'String' },
        Experience: {
          company: 'String!',
          position: 'String!',
          startMonth: 'String!',
          endMonth: 'String',
          achievements: '[String!]!',
        },
        Project: {
          name: 'String!',
          description: 'String!',
          url: 'String!',
        },
      };

      for (const [name, fields] of Object.entries(expected)) {
        const type = schema.getType(name);
        if (!isObjectType(type)) {
          throw new Error(`Expected GraphQL object type ${name}`);
        }
        expect(
          Object.fromEntries(
            Object.entries(type.getFields()).map(([fieldName, field]) => [
              fieldName,
              field.type.toString(),
            ]),
          ),
        ).toEqual(fields);
      }
    } finally {
      await moduleRef.close();
    }
  });
});
