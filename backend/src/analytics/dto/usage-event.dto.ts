import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { UsageEventType } from '../entities/usage-event.entity';

export class CreateUsageEventDto {
  @IsUUID()
  learningObjectId: string;

  @IsEnum(UsageEventType)
  eventType: UsageEventType;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
