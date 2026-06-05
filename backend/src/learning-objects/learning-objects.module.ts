import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningObjectsController } from './learning-objects.controller';
import { LearningObjectsService } from './learning-objects.service';
import { LearningObject } from './entities/learning-object.entity';
import { AiService } from '../ai/ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([LearningObject])],
  controllers: [LearningObjectsController],
  providers: [LearningObjectsService, AiService],
  exports: [LearningObjectsService],
})
export class LearningObjectsModule {}
