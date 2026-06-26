import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { LearningObjectsModule } from '../learning-objects/learning-objects.module';
import { LtiController } from './lti.controller';
import { LtiPlatformsController } from './lti-platforms.controller';
import { LtiService } from './lti.service';
import { LtiPlatform } from './entities/lti-platform.entity';
import { LtiPlatformsService } from './lti-platforms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LtiPlatform]),
    AnalyticsModule,
    AuthModule,
    LearningObjectsModule,
    JwtModule,
  ],
  controllers: [LtiController, LtiPlatformsController],
  providers: [LtiService, LtiPlatformsService],
})
export class LtiModule {}
