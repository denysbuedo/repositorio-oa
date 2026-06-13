import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningObjectFiltersController } from './learning-object-filters.controller';
import { LearningObjectsController } from './learning-objects.controller';
import { LearningObjectsService } from './learning-objects.service';
import { LearningObject } from './entities/learning-object.entity';
import { AiService } from '../ai/ai.service';
import { AuthModule } from '../auth/auth.module';
import { Collection } from '../collections/entities/collection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearningObject, Collection]),
    AuthModule,
    JwtModule,
  ],
  controllers: [LearningObjectsController, LearningObjectFiltersController],
  providers: [LearningObjectsService, AiService],
  exports: [LearningObjectsService],
})
export class LearningObjectsModule {}
