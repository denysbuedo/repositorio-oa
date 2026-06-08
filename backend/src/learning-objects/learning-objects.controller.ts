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
} from '@nestjs/common';
import type { Request } from 'express';
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

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Controller('learning-objects')
@UseGuards(AuthGuard)
export class LearningObjectsController {
  constructor(
    private readonly service: LearningObjectsService,
    private readonly aiService: AiService,
    private readonly authService: AuthService,
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
    @Query('scope') scope?: string,
    @Req() request?: Request,
  ) {
    const isAdminScope = scope === 'admin';
    if (isAdminScope) {
      await this.authService.validateBearerToken(
        request?.headers.authorization,
      );
    }

    return this.service.findAll(query, difficulty, type, isAdminScope);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findPublishedOne(id);
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

  @Get(':id/html')
  @Public()
  async getHtml(@Param('id', ParseUUIDPipe) id: string) {
    const html = await this.service.getObjectHtml(id, true);
    return { html };
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

    // 1. Actualizar referencia del archivo
    const fileUrl = `uploads/${file.filename}`;
    const updatedObject = await this.service.updateFileReference(
      id,
      fileUrl,
      file.mimetype,
    );

    // 2. IA: Extraer texto y generar metadatos LOM automáticamente
    try {
      const text = await this.aiService.extractText(file.path, file.mimetype);
      if (text) {
        const generatedLom = await this.aiService.generateMetadata(text);
        await this.service.update(id, { lomMetadata: generatedLom });
      }
    } catch (error) {
      console.error('Error en el procesamiento de IA:', error);
    }

    return updatedObject;
  }
}
