import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProfileResolver } from './profile.resolver';
import { ProfileService } from './profile.service';

@Module({
  imports: [DatabaseModule],
  providers: [ProfileService, ProfileResolver],
})
export class ProfileModule {}
