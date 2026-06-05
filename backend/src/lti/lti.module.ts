import { Module } from '@nestjs/common';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

@Module({
  controllers: [LtiController],
  providers: [LtiService],
})
export class LtiModule {}
