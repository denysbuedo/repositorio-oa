import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as mammoth from 'mammoth';
import {
  LearningObject,
  ObjectStatus,
} from './entities/learning-object.entity';
import {
  CreateLearningObjectDto,
  UpdateLearningObjectDto,
} from './dto/learning-object.dto';

@Injectable()
export class LearningObjectsService {
  constructor(
    @InjectRepository(LearningObject)
    private readonly repository: Repository<LearningObject>,
  ) {}

  async create(createDto: CreateLearningObjectDto): Promise<LearningObject> {
    const learningObject = this.repository.create(createDto);
    return await this.repository.save(learningObject);
  }

  async findAll(
    query?: string,
    difficulty?: string,
    type?: string,
    includeUnpublished = false,
  ): Promise<LearningObject[]> {
    const qb = this.repository.createQueryBuilder('lo');

    if (!includeUnpublished) {
      qb.andWhere('lo.status = :status', { status: ObjectStatus.PUBLISHED });
    }

    if (query) {
      qb.andWhere('(lo.title ILIKE :query OR lo.description ILIKE :query)', {
        query: `%${query}%`,
      });
    }

    if (difficulty) {
      // Búsqueda dentro del JSONB de LOM
      qb.andWhere(
        "lo.lomMetadata->'educational'->>'difficulty' = :difficulty",
        { difficulty },
      );
    }

    if (type) {
      qb.andWhere(
        "lo.lomMetadata->'educational'->>'learningResourceType' = :type",
        { type },
      );
    }

    qb.orderBy('lo.createdAt', 'DESC');
    return await qb.getMany();
  }

  async findOne(id: string): Promise<LearningObject> {
    const object = await this.repository.findOne({ where: { id } });
    if (!object) {
      throw new NotFoundException(
        `Objeto de aprendizaje con ID ${id} no encontrado`,
      );
    }
    return object;
  }

  async findPublishedOne(id: string): Promise<LearningObject> {
    const object = await this.repository.findOne({
      where: { id, status: ObjectStatus.PUBLISHED },
    });
    if (!object) {
      throw new NotFoundException(
        `Objeto de aprendizaje publicado con ID ${id} no encontrado`,
      );
    }
    return object;
  }

  async update(
    id: string,
    updateDto: UpdateLearningObjectDto,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    const updated = this.repository.merge(object, updateDto);
    return await this.repository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const object = await this.findOne(id);
    await this.repository.remove(object);
  }

  async updateFileReference(
    id: string,
    fileUrl: string,
    mimeType: string,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    object.fileUrl = fileUrl;
    object.fileMimeType = mimeType;
    return await this.repository.save(object);
  }

  async getObjectHtml(id: string, publishedOnly = false): Promise<string> {
    const object = publishedOnly
      ? await this.findPublishedOne(id)
      : await this.findOne(id);
    if (
      object.fileMimeType !==
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new BadRequestException('El objeto no es un documento Word');
    }

    // Aseguramos que la ruta sea absoluta para evitar errores en Windows
    const filePath = path.resolve(process.cwd(), object.fileUrl);
    console.log(`📄 Convirtiendo Word a HTML: ${filePath}`);

    try {
      const result = await mammoth.convertToHtml({ path: filePath });
      console.log(`✅ Conversión exitosa.`);
      console.log(`📝 Warnings de Mammoth:`, result.messages);
      console.log(`📏 Caracteres generados: ${result.value.length}`);

      if (result.value.length === 0) {
        console.warn(
          '⚠️ Mammoth devolvió un string vacío. Verificando buffer...',
        );
        const buffer = fs.readFileSync(filePath);
        console.log(`📦 Tamaño del buffer del archivo: ${buffer.length} bytes`);
      }

      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error en Mammoth: ${message}`);
      throw error;
    }
  }
}
