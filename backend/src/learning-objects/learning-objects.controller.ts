import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { LearningObjectsService } from './learning-objects.service';
import { AiService } from '../ai/ai.service';
import {
  CreateLearningObjectDto,
  UpdateLearningObjectDto,
} from './dto/learning-object.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';
import { AuthService } from '../auth/auth.service';
import { promises as fs } from 'fs';
import { AnalyticsService } from '../analytics/analytics.service';
import { UsageEventType } from '../analytics/entities/usage-event.entity';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const acceptedFormatPolicy: Record<
  string,
  {
    extensions: string[];
    label: string;
  }
> = {
  'application/pdf': {
    extensions: ['.pdf'],
    label: 'PDF',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    label: 'DOCX',
  },
};

@Controller('learning-objects')
@UseGuards(AuthGuard)
export class LearningObjectsController {
  constructor(
    private readonly service: LearningObjectsService,
    private readonly aiService: AiService,
    private readonly authService: AuthService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateLearningObjectDto) {
    return this.service.create(createDto);
  }

  @Get()
  @Public()
  async findAll(
    @Query('q') query?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('collectionId') collectionId?: string,
    @Query('scope') scope?: string,
    @Req() request?: Request,
  ) {
    const isAdminScope = scope === 'admin';
    if (isAdminScope) {
      await this.authService.validateBearerToken(
        request?.headers.authorization,
      );
    }

    return this.service.findAll(
      query,
      difficulty,
      type,
      collectionId,
      isAdminScope,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLearningObjectDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(':id/metadata')
  @Public()
  getMetadata(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getMetadataExport(id);
  }

  @Get(':id/html')
  @Public()
  async getHtml(@Param('id', ParseUUIDPipe) id: string) {
    const html = await this.service.getObjectHtml(id, true);
    return { html };
  }

  @Get(':id/download')
  @Public()
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('source') source: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.service.getDownloadFile(id);
    await this.analyticsService.recordEvent({
      learningObjectId: id,
      eventType: UsageEventType.DOWNLOAD,
      source: source || 'public',
    });
    return res.download(file.path, file.filename);
  }

  @Get(':id/versions')
  findVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findVersions(id);
  }

  @Get(':id/preservation-events')
  findPreservationEvents(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findPreservationEvents(id);
  }

  @Get(':id/quality-report')
  getQualityReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getQualityReport(id);
  }

  @Get('admin/integrity-audit')
  getIntegrityAudit() {
    return this.service.getIntegrityAudit();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findPublishedOne(id);
  }

  /**
   * Endpoint para subir el archivo físico del objeto de aprendizaje.
   * Se almacena localmente en la carpeta 'uploads'.
   * Tras la subida, se dispara el análisis de IA.
   */
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
          return cb(
            new BadRequestException('Solo se permiten archivos PDF o DOCX'),
            false,
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? 10 * 1024 * 1024),
      },
    }),
  )
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibio ningun archivo valido');
    }

    try {
      await validateUploadedFileContent(file);
    } catch (error) {
      await removeUploadedFile(file.path);
      throw error;
    }

    const fileUrl = `uploads/${file.filename}`;
    const updatedObject = await this.service.updateFileReference(
      id,
      fileUrl,
      file.mimetype,
      file.originalname,
      file.size,
      file.path,
    );

    void this.processUploadedFile(id, file.path, file.mimetype);

    return updatedObject;
  }

  private async processUploadedFile(
    id: string,
    filePath: string,
    mimeType: string,
  ) {
    try {
      await this.service.markProcessing(id);
      const text = await this.aiService.extractText(filePath, mimeType);

      if (!text) {
        await this.service.markProcessingFailed(
          id,
          'No se pudo extraer texto del archivo',
        );
        return;
      }

      const generatedLom = await this.aiService.generateMetadata(text);
      await this.service.markProcessingReady(id, generatedLom);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await this.service.markProcessingFailed(id, message);
      } catch (statusError) {
        console.error('Error actualizando el estado de IA:', statusError);
      }
      console.error('Error en el procesamiento de IA:', error);
    }
  }
}

async function validateUploadedFileContent(file: Express.Multer.File) {
  const policy = acceptedFormatPolicy[file.mimetype];
  const originalExtension = extname(file.originalname).toLowerCase();

  if (!policy || !policy.extensions.includes(originalExtension)) {
    throw new BadRequestException(
      'El archivo no coincide con la politica de formatos aceptados',
    );
  }

  const buffer = await fs.readFile(file.path);
  const isValid =
    file.mimetype === 'application/pdf' ? isPdf(buffer) : isDocx(buffer);

  if (!isValid) {
    throw new BadRequestException(
      `El contenido del archivo no corresponde a un ${policy.label} valido`,
    );
  }
}

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isDocx(buffer: Buffer) {
  if (buffer.subarray(0, 2).toString('ascii') !== 'PK') return false;

  const zipText = buffer.toString('latin1');
  return (
    zipText.includes('[Content_Types].xml') &&
    zipText.includes('word/document.xml')
  );
}

async function removeUploadedFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch {
    // El archivo pudo no haberse escrito o ya haber sido eliminado.
  }
}
