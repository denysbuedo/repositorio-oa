import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateLtiPlatformDto,
  UpdateLtiPlatformDto,
} from './dto/lti-platform.dto';
import { LtiPlatformsService } from './lti-platforms.service';

@Controller('lti/platforms')
@UseGuards(AuthGuard)
export class LtiPlatformsController {
  constructor(private readonly service: LtiPlatformsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateLtiPlatformDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLtiPlatformDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
