import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import * as mammoth from 'mammoth';
import {
  LearningObject,
  ObjectStatus,
  ProcessingStatus,
} from './entities/learning-object.entity';
import {
  LearningObjectVersion,
  VersionChangeType,
} from './entities/learning-object-version.entity';
import {
  LearningObjectPreservationEvent,
  PreservationEventType,
} from './entities/learning-object-preservation-event.entity';
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
  accessibility?: {
    textSelectable?: AccessibilityValue;
    structuredHeadings?: AccessibilityValue;
    altText?: AccessibilityValue;
    readingOrder?: AccessibilityValue;
    sufficientContrast?: AccessibilityValue;
    captionsOrTranscript?: AccessibilityValue;
    notes?: string;
  };
};

type AccessibilityValue = 'yes' | 'no' | 'not_applicable' | '';
type QualityIssueSeverity = 'blocker' | 'warning';

@Injectable()
export class LearningObjectsService {
  constructor(
    @InjectRepository(LearningObject)
    private readonly repository: Repository<LearningObject>,
    @InjectRepository(LearningObjectVersion)
    private readonly versionRepository: Repository<LearningObjectVersion>,
    @InjectRepository(LearningObjectPreservationEvent)
    private readonly preservationEventRepository: Repository<LearningObjectPreservationEvent>,
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

  async findVersions(id: string) {
    await this.findOne(id);

    return await this.versionRepository.find({
      where: { learningObjectId: id },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        versionLabel: true,
        changeType: true,
        title: true,
        author: true,
        originalFilename: true,
        fileSize: true,
        fileChecksumSha256: true,
        changeNote: true,
        createdAt: true,
      },
    });
  }

  async findPreservationEvents(id: string) {
    await this.findOne(id);

    return await this.preservationEventRepository.find({
      where: { learningObjectId: id },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        eventType: true,
        versionLabel: true,
        message: true,
        details: true,
        actor: true,
        createdAt: true,
      },
    });
  }

  async getQualityReport(id: string) {
    const object = await this.findOne(id);
    return buildQualityReport(object);
  }

  async update(
    id: string,
    updateDto: UpdateLearningObjectDto,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    const previousStatus = object.status;
    const previousVersion = object.currentVersion;
    await this.validateCollection(updateDto.collectionId);
    const updated = this.repository.merge(object, updateDto);

    if (updateDto.status === ObjectStatus.PUBLISHED) {
      this.validatePublishProfile(updated);
      this.validateQualityForPublication(updated);
    }

    const shouldSnapshot = updated.status === ObjectStatus.PUBLISHED;

    if (shouldSnapshot) {
      updated.currentVersion =
        previousStatus === ObjectStatus.PUBLISHED
          ? getNextMinorVersion(previousVersion)
          : previousVersion && previousVersion !== '0.1'
            ? previousVersion
            : '1.0';
    }

    this.refreshStableIdentifiers(updated);

    const saved = await this.repository.save(updated);

    if (shouldSnapshot) {
      await this.createVersionSnapshot(
        saved,
        previousStatus === ObjectStatus.PUBLISHED
          ? VersionChangeType.METADATA_UPDATE
          : VersionChangeType.INITIAL_PUBLICATION,
      );
    }

    return saved;
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
    filePath: string,
  ): Promise<LearningObject> {
    const object = await this.findOne(id);
    const previousFileUrl = object.fileUrl;
    const previousChecksum = object.fileChecksumSha256;
    object.fileUrl = fileUrl;
    object.fileMimeType = mimeType;
    object.fileChecksumSha256 = await calculateSha256(filePath);
    object.originalFilename = originalFilename;
    object.fileSize = fileSize;
    object.uploadedAt = new Date();
    object.processingStatus = ProcessingStatus.PENDING;
    object.processingError = null;

    if (object.status === ObjectStatus.PUBLISHED) {
      object.currentVersion = getNextMinorVersion(object.currentVersion);
    }

    this.refreshStableIdentifiers(object);

    const saved = await this.repository.save(object);

    await this.createPreservationEvent(saved, {
      eventType: PreservationEventType.CHECKSUM_CALCULATED,
      message: 'Checksum SHA-256 calculado para el archivo cargado.',
      details: {
        checksumSha256: saved.fileChecksumSha256,
        originalFilename: saved.originalFilename,
        fileSize: saved.fileSize,
        fileMimeType: saved.fileMimeType,
      },
    });

    if (previousFileUrl) {
      await this.createPreservationEvent(saved, {
        eventType: PreservationEventType.FILE_REPLACED,
        message: 'Archivo del objeto de aprendizaje reemplazado.',
        details: {
          previousFileUrl,
          newFileUrl: saved.fileUrl,
          previousChecksumSha256: previousChecksum,
          newChecksumSha256: saved.fileChecksumSha256,
          originalFilename: saved.originalFilename,
        },
      });
    }

    if (saved.status === ObjectStatus.PUBLISHED) {
      await this.createVersionSnapshot(saved, VersionChangeType.FILE_UPDATE);
    }

    return saved;
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

  async getDownloadFile(
    id: string,
  ): Promise<{ path: string; filename: string }> {
    const object = await this.findPublishedOne(id);
    if (!object.fileUrl) {
      throw new NotFoundException('El recurso no tiene archivo disponible');
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(process.cwd(), object.fileUrl);
    const normalizedRoot = uploadsRoot.toLowerCase();
    const normalizedFilePath = filePath.toLowerCase();

    if (
      normalizedFilePath !== normalizedRoot &&
      !normalizedFilePath.startsWith(`${normalizedRoot}${path.sep}`)
    ) {
      throw new BadRequestException('Ruta de archivo no permitida');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en el servidor');
    }

    return {
      path: filePath,
      filename: object.originalFilename ?? path.basename(filePath),
    };
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

  private validateQualityForPublication(object: LearningObject) {
    const report = buildQualityReport(object);

    if (report.blockers.length > 0) {
      throw new BadRequestException({
        message: 'El recurso tiene bloqueos de calidad antes de publicar',
        qualityBlockers: report.blockers,
        qualityWarnings: report.warnings,
      });
    }
  }

  private refreshStableIdentifiers(object: LearningObject) {
    object.canonicalUrl = buildCanonicalUrl(object.id);
    object.persistentIdentifier =
      object.persistentIdentifier?.trim() || object.canonicalUrl;
    object.citationText = buildCitationText(object);
  }

  private async createVersionSnapshot(
    object: LearningObject,
    changeType: VersionChangeType,
  ) {
    const existing = await this.versionRepository.findOne({
      where: {
        learningObjectId: object.id,
        versionLabel: object.currentVersion,
      },
    });

    if (existing) return existing;

    const snapshot = this.versionRepository.create({
      learningObjectId: object.id,
      versionLabel: object.currentVersion,
      changeType,
      title: object.title,
      description: object.description ?? null,
      author: object.author,
      lomMetadata: object.lomMetadata ?? null,
      fileUrl: object.fileUrl ?? null,
      fileMimeType: object.fileMimeType ?? null,
      originalFilename: object.originalFilename ?? null,
      fileSize: object.fileSize ?? null,
      fileChecksumSha256: object.fileChecksumSha256 ?? null,
      changeNote: getVersionChangeNote(changeType),
    });

    const savedSnapshot = await this.versionRepository.save(snapshot);

    await this.createPreservationEvent(object, {
      eventType: PreservationEventType.VERSION_SNAPSHOT_CREATED,
      versionId: savedSnapshot.id,
      versionLabel: savedSnapshot.versionLabel,
      message: getVersionChangeNote(changeType),
      details: {
        changeType,
        originalFilename: savedSnapshot.originalFilename,
        checksumSha256: savedSnapshot.fileChecksumSha256,
      },
    });

    return savedSnapshot;
  }

  private async createPreservationEvent(
    object: LearningObject,
    event: {
      eventType: PreservationEventType;
      message: string;
      versionId?: string | null;
      versionLabel?: string | null;
      details?: Record<string, unknown> | null;
      actor?: string | null;
    },
  ) {
    const preservationEvent = this.preservationEventRepository.create({
      learningObjectId: object.id,
      versionId: event.versionId ?? null,
      versionLabel: event.versionLabel ?? object.currentVersion ?? null,
      eventType: event.eventType,
      message: event.message,
      details: event.details ?? null,
      actor: event.actor ?? 'system',
    });

    return await this.preservationEventRepository.save(preservationEvent);
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

function buildQualityReport(object: LearningObject) {
  const issues: Array<{
    code: string;
    label: string;
    severity: QualityIssueSeverity;
    category: 'metadata' | 'file' | 'preservation' | 'accessibility';
  }> = [];

  for (const field of getPublishProfileMissingFields(object)) {
    issues.push({
      code: `missing_${field.replace(/\s+/g, '_')}`,
      label: `Falta ${field}.`,
      severity: 'blocker',
      category: 'metadata',
    });
  }

  if (!object.fileChecksumSha256) {
    issues.push({
      code: 'missing_checksum',
      label: 'Falta checksum SHA-256 del archivo.',
      severity: 'blocker',
      category: 'preservation',
    });
  }

  if (!object.currentVersion) {
    issues.push({
      code: 'missing_version',
      label: 'Falta version visible del recurso.',
      severity: 'warning',
      category: 'preservation',
    });
  }

  const accessibility = ((object.lomMetadata ?? {}) as LomMetadata)
    .accessibility;
  for (const item of getAccessibilityQualityItems(accessibility)) {
    issues.push(item);
  }

  const blockers = issues.filter((issue) => issue.severity === 'blocker');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const totalChecks = 12 + getAccessibilityCheckKeys().length;
  const passedChecks = Math.max(totalChecks - issues.length, 0);

  return {
    score: Math.round((passedChecks / totalChecks) * 100),
    status:
      blockers.length > 0
        ? 'blocked'
        : warnings.length > 0
          ? 'needs_review'
          : 'ready',
    blockers,
    warnings,
    summary: {
      totalChecks,
      passedChecks,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    },
  };
}

function getAccessibilityQualityItems(
  accessibility?: LomMetadata['accessibility'],
) {
  return getAccessibilityCheckKeys().flatMap((item) => {
    const value = accessibility?.[item.key];

    if (!value) {
      return [
        {
          code: `accessibility_unreviewed_${item.key}`,
          label: `${item.label} sin revisar.`,
          severity: 'warning' as const,
          category: 'accessibility' as const,
        },
      ];
    }

    if (value === 'no') {
      return [
        {
          code: `accessibility_failed_${item.key}`,
          label: `${item.label}: no cumple.`,
          severity: item.required ? ('blocker' as const) : ('warning' as const),
          category: 'accessibility' as const,
        },
      ];
    }

    return [];
  });
}

function getAccessibilityCheckKeys(): Array<{
  key: keyof NonNullable<LomMetadata['accessibility']>;
  label: string;
  required: boolean;
}> {
  return [
    { key: 'textSelectable', label: 'Texto seleccionable', required: true },
    {
      key: 'structuredHeadings',
      label: 'Encabezados estructurados',
      required: false,
    },
    { key: 'altText', label: 'Texto alternativo', required: false },
    { key: 'readingOrder', label: 'Orden de lectura', required: true },
    {
      key: 'sufficientContrast',
      label: 'Contraste suficiente',
      required: true,
    },
    {
      key: 'captionsOrTranscript',
      label: 'Subtitulos o transcripcion',
      required: false,
    },
  ];
}

function buildMetadataExport(object: LearningObject) {
  const metadata = (object.lomMetadata ?? {}) as LomMetadata;
  const keywords = metadata.general?.keyword ?? [];
  const canonicalUrl = object.canonicalUrl ?? buildCanonicalUrl(object.id);
  const persistentIdentifier = object.persistentIdentifier ?? canonicalUrl;
  const citationText = object.citationText ?? buildCitationText(object);
  const fileUrl = object.fileUrl ? buildApiFileUrl(object.fileUrl) : null;
  const license = metadata.rights?.license ?? null;

  return {
    identifier: object.id,
    canonicalUrl,
    persistentIdentifier,
    citationText,
    formats: ['dublinCore', 'lrmi'],
    dublinCore: {
      identifier: persistentIdentifier,
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
      version: object.currentVersion,
      bibliographicCitation: citationText,
    },
    lrmi: {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': canonicalUrl,
      url: canonicalUrl,
      identifier: persistentIdentifier,
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
      version: object.currentVersion,
      citation: citationText,
      sha256: object.fileChecksumSha256 ?? undefined,
      accessibilitySummary: metadata.accessibility?.notes ?? undefined,
      accessibilityFeature: getAccessibilityFeatures(metadata.accessibility),
      dateCreated: object.createdAt,
      dateModified: object.updatedAt,
    },
  };
}

async function calculateSha256(filePath: string) {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
}

function getNextMinorVersion(currentVersion?: string | null) {
  const [majorValue, minorValue] = (currentVersion ?? '1.0')
    .split('.')
    .map((value) => Number.parseInt(value, 10));
  const major = Number.isFinite(majorValue) && majorValue > 0 ? majorValue : 1;
  const minor = Number.isFinite(minorValue) ? minorValue + 1 : 1;
  return `${major}.${minor}`;
}

function getVersionChangeNote(changeType: VersionChangeType) {
  switch (changeType) {
    case VersionChangeType.FILE_UPDATE:
      return 'Actualizacion del archivo preservado.';
    case VersionChangeType.METADATA_UPDATE:
      return 'Actualizacion de metadatos de un recurso publicado.';
    default:
      return 'Primera publicacion del recurso.';
  }
}

function getAccessibilityFeatures(metadata?: LomMetadata['accessibility']) {
  if (!metadata) return undefined;

  const features = [
    metadata.textSelectable === 'yes' ? 'textual' : null,
    metadata.structuredHeadings === 'yes' ? 'structuralNavigation' : null,
    metadata.altText === 'yes' ? 'alternativeText' : null,
    metadata.readingOrder === 'yes' ? 'readingOrder' : null,
    metadata.captionsOrTranscript === 'yes' ? 'captions' : null,
  ].filter(Boolean);

  return features.length > 0 ? features : undefined;
}

function buildCanonicalUrl(id: string) {
  const baseUrl =
    process.env.FRONTEND_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_FRONTEND_URL ??
    'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/objects/${id}`;
}

function buildCitationText(object: LearningObject) {
  const year = object.updatedAt
    ? new Date(object.updatedAt).getFullYear()
    : new Date().getFullYear();
  const canonicalUrl = object.canonicalUrl ?? buildCanonicalUrl(object.id);
  const version = object.currentVersion ?? '0.1';

  return `${object.author}. (${year}). ${object.title} (Version ${version}) [Objeto de aprendizaje]. Repositorio OA. ${canonicalUrl}`;
}

function buildApiFileUrl(filePath: string) {
  const baseUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  return `${baseUrl.replace(/\/$/, '')}/${filePath.replace(/\\/g, '/')}`;
}
