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
  ProcessingStatus,
} from './entities/learning-object.entity';
import { Collection } from '../collections/entities/collection.entity';
import {
  CreateLearningObjectDto,
  UpdateLearningObjectDto,
} from './dto/learning-object.dto';

const difficultyExpression = "lo.\"lomMetadata\"->'educational'->>'difficulty'";
const resourceTypeExpression =
  "COALESCE(lo.\"lomMetadata\"->'educational'->>'learningResourceType', lo.\"lomMetadata\"->'educational'->>'learning-resource-type')";

type LomMetadata = {
  general?: {
    language?: string;
    keyword?: string[];
  };
  educational?: {
    learningResourceType?: string;
    difficulty?: string;
    educationalLevel?: string;
    intendedEndUserRole?: string;
  };
  rights?: {
    license?: string;
    description?: string;
  };
};

@Injectable()
export class LearningObjectsService {
  constructor(
    @InjectRepository(LearningObject)
    private readonly repository: Repository<LearningObject>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  async create(createDto: CreateLearningObjectDto): Promise<LearningObject> {
    await this.validateCollection(createDto.collectionId);
    const learningObject = this.repository.create(createDto);
    return await this.repository.save(learningObject);
  }

  async findAll(
    query?: string,
    difficulty?: string,
    type?: string,
    collectionId?: string,
    includeUnpublished = false,
  ): Promise<LearningObject[]> {
    const qb = this.repository
      .createQueryBuilder('lo')
      .leftJoinAndSelect('lo.collection', 'collection');

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
      qb.andWhere(`${difficultyExpression} = :difficulty`, { difficulty });
    }

    if (type) {
      qb.andWhere(`${resourceTypeExpression} = :type`, { type });
    }

    if (collectionId) {
      if (collectionId === 'none') {
        qb.andWhere('lo."collectionId" IS NULL');
      } else {
        qb.andWhere('lo."collectionId" = :collectionId', { collectionId });
      }
    }

    qb.orderBy('lo.createdAt', 'DESC');
    return await qb.getMany();
  }

  async getFilterFacets(includeUnpublished = false): Promise<{
    difficulties: string[];
    types: string[];
  }> {
    const baseQuery = this.repository
      .createQueryBuilder('lo')
      .select(`DISTINCT ${difficultyExpression}`, 'value')
      .where(`${difficultyExpression} IS NOT NULL`)
      .andWhere(`${difficultyExpression} <> ''`);

    if (!includeUnpublished) {
      baseQuery.andWhere('lo.status = :status', {
        status: ObjectStatus.PUBLISHED,
      });
    }

    const typeQuery = this.repository
      .createQueryBuilder('lo')
      .select(`DISTINCT ${resourceTypeExpression}`, 'value')
      .where(`${resourceTypeExpression} IS NOT NULL`)
      .andWhere(`${resourceTypeExpression} <> ''`);

    if (!includeUnpublished) {
      typeQuery.andWhere('lo.status = :status', {
        status: ObjectStatus.PUBLISHED,
      });
    }

    const [difficultyRows, typeRows] = await Promise.all([
      baseQuery.orderBy('value', 'ASC').getRawMany<{ value: string }>(),
      typeQuery.orderBy('value', 'ASC').getRawMany<{ value: string }>(),
    ]);

    return {
      difficulties: difficultyRows.map((row) => row.value),
      types: typeRows.map((row) => row.value),
    };
  }

  async findOne(id: string): Promise<LearningObject> {
    const object = await this.repository.findOne({
      where: { id },
      relations: ['collection'],
    });
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
      relations: ['collection'],
    });
    if (!object) {
      throw new NotFoundException(
        `Objeto de aprendizaje publicado con ID ${id} no encontrado`,
      );
    }
    return object;
  }

  async getMetadataExport(id: string) {
    const object = await this.findPublishedOne(id);
    return buildMetadataExport(object);
  }

  async update(
    id: string,
    updateDto: UpdateLearningObjectDto,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    await this.validateCollection(updateDto.collectionId);
    const updated = this.repository.merge(object, updateDto);

    if (updateDto.status === ObjectStatus.PUBLISHED) {
      this.validatePublishProfile(updated);
    }

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
    originalFilename: string,
    fileSize: number,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    object.fileUrl = fileUrl;
    object.fileMimeType = mimeType;
    object.originalFilename = originalFilename;
    object.fileSize = fileSize;
    object.uploadedAt = new Date();
    object.processingStatus = ProcessingStatus.PENDING;
    object.processingError = null;
    return await this.repository.save(object);
  }

  async markProcessing(id: string): Promise<LearningObject> {
    const object = await this.findOne(id);
    object.processingStatus = ProcessingStatus.PROCESSING;
    object.processingError = null;
    return await this.repository.save(object);
  }

  async markProcessingReady(
    id: string,
    lomMetadata: unknown,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    object.lomMetadata = lomMetadata;
    object.processingStatus = ProcessingStatus.READY;
    object.processingError = null;
    return await this.repository.save(object);
  }

  async markProcessingFailed(
    id: string,
    error: string,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    object.processingStatus = ProcessingStatus.FAILED;
    object.processingError = error;
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

  private async validateCollection(collectionId?: string | null) {
    if (!collectionId) return;

    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new BadRequestException('La coleccion seleccionada no existe');
    }
  }

  private validatePublishProfile(object: LearningObject) {
    const missing = getPublishProfileMissingFields(object);

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'El recurso no cumple el perfil minimo para publicacion',
        missingFields: missing,
      });
    }
  }
}

function getPublishProfileMissingFields(object: LearningObject): string[] {
  const metadata = (object.lomMetadata ?? {}) as LomMetadata;
  const keywords = metadata.general?.keyword;
  const missing: string[] = [];

  if (!object.title?.trim()) missing.push('titulo');
  if (!object.description?.trim()) missing.push('descripcion');
  if (!object.author?.trim()) missing.push('autor');
  if (!object.fileUrl) missing.push('archivo');
  if (!object.collectionId) missing.push('coleccion');
  if (!metadata.general?.language?.trim()) missing.push('idioma');
  if (!Array.isArray(keywords) || keywords.length === 0) {
    missing.push('palabras clave');
  }
  if (!metadata.educational?.learningResourceType?.trim()) {
    missing.push('tipo de recurso');
  }
  if (!metadata.educational?.difficulty?.trim()) {
    missing.push('nivel de dificultad');
  }
  if (!metadata.educational?.educationalLevel?.trim()) {
    missing.push('nivel educativo');
  }
  if (!metadata.educational?.intendedEndUserRole?.trim()) {
    missing.push('audiencia');
  }
  if (!metadata.rights?.license?.trim()) missing.push('licencia');

  return missing;
}

function buildMetadataExport(object: LearningObject) {
  const metadata = (object.lomMetadata ?? {}) as LomMetadata;
  const keywords = metadata.general?.keyword ?? [];
  const canonicalUrl = buildCanonicalUrl(object.id);
  const fileUrl = object.fileUrl ? buildApiFileUrl(object.fileUrl) : null;
  const license = metadata.rights?.license ?? null;

  return {
    identifier: object.id,
    canonicalUrl,
    formats: ['dublinCore', 'lrmi'],
    dublinCore: {
      identifier: canonicalUrl,
      title: object.title,
      creator: object.author,
      description: object.description ?? '',
      subject: keywords,
      language: metadata.general?.language ?? null,
      type: metadata.educational?.learningResourceType ?? null,
      format: object.fileMimeType ?? null,
      rights: license,
      relation: object.collection?.name ?? null,
      date: object.createdAt,
      source: fileUrl,
    },
    lrmi: {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': canonicalUrl,
      url: canonicalUrl,
      name: object.title,
      description: object.description ?? '',
      author: {
        '@type': 'Person',
        name: object.author,
      },
      keywords,
      inLanguage: metadata.general?.language ?? undefined,
      learningResourceType:
        metadata.educational?.learningResourceType ?? undefined,
      educationalLevel: metadata.educational?.educationalLevel ?? undefined,
      audience: metadata.educational?.intendedEndUserRole
        ? {
            '@type': 'EducationalAudience',
            educationalRole: metadata.educational.intendedEndUserRole,
          }
        : undefined,
      license: license ?? undefined,
      isPartOf: object.collection
        ? {
            '@type': 'Collection',
            name: object.collection.name,
          }
        : undefined,
      encodingFormat: object.fileMimeType ?? undefined,
      contentUrl: fileUrl ?? undefined,
      dateCreated: object.createdAt,
      dateModified: object.updatedAt,
    },
  };
}

function buildCanonicalUrl(id: string) {
  const baseUrl =
    process.env.FRONTEND_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/objects/${id}`;
}

function buildApiFileUrl(filePath: string) {
  const baseUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/${filePath.replace(/\\/g, '/')}`;
}
