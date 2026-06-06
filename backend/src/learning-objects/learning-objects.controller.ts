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
} from '@nestjs/common';
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

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Controller('learning-objects')
export class LearningObjectsController {
  constructor(
    private readonly service: LearningObjectsService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createDto: CreateLearningObjectDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(
    @Query('q') query?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
  ) {
    return this.service.findAll(query, difficulty, type);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateLearningObjectDto,
  ) {
    return this.service.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(':id/html')
  async getHtml(@Param('id', ParseUUIDPipe) id: string) {
    const html = await this.service.getObjectHtml(id);
    return { html };
  }

  /**
   * Endpoint para subir el archivo físico del objeto de aprendizaje.
   * Se almacena localmente en la carpeta 'uploads'.
   * Tras la subida, se dispara el análisis de IA.
   */
  @Post(':id/upload')
  @UseGuards(AuthGuard)
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
