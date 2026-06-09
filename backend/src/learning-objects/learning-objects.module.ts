import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningObjectFiltersController } from './learning-object-filters.controller';
import { LearningObjectsController } from './learning-objects.controller';
import { LearningObjectsService } from './learning-objects.service';
import { LearningObject } from './entities/learning-object.entity';
import { AiService } from '../ai/ai.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([LearningObject]), AuthModule],
  controllers: [LearningObjectsController, LearningObjectFiltersController],
  providers: [LearningObjectsService, AiService],
  exports: [LearningObjectsService],
})
export class LearningObjectsModule {}
