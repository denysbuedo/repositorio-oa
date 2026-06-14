import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../collections/entities/collection.entity';
import { LearningObject } from '../learning-objects/entities/learning-object.entity';
import { OaiController } from './oai.controller';
import { OaiService } from './oai.service';

@Module({
  imports: [TypeOrmModule.forFeature([LearningObject, Collection])],
  controllers: [OaiController],
  providers: [OaiService],
})
export class OaiModule {}
