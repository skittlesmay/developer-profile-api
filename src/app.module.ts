import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { GraphQLModule } from '@nestjs/graphql';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health.controller';
import { ProfileModule } from './profile/profile.module';
import type { GraphQLContext } from './profile/profile.context';
import { createProfileLoaders } from './profile/profile.loaders';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    ProfileModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DatabaseModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        driver: ApolloDriver,
        autoSchemaFile: true,
        sortSchema: true,
        graphiql: false,
        introspection: true,
        plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
        context: (): GraphQLContext => ({
          loaders: createProfileLoaders(prisma),
        }),
      }),
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
