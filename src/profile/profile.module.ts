import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProfileService } from './profile.service';

@Module({
  imports: [DatabaseModule],
  providers: [ProfileService],
})
export class ProfileModule {}
