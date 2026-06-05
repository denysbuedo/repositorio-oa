import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ObjectStatus } from '../entities/learning-object.entity';

export class CreateLearningObjectDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsEnum(ObjectStatus)
  status?: ObjectStatus;

  /**
   * Estructura IEEE LOM.
   * En esta fase inicial aceptamos cualquier objeto JSON válido,
   * pero más adelante validaremos sub-campos específicos.
   */
  @IsOptional()
  @IsObject()
  lomMetadata?: any;
}

export class UpdateLearningObjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ObjectStatus)
  status?: ObjectStatus;

  @IsOptional()
  @IsObject()
  lomMetadata?: any;
}
