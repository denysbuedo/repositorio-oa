import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';
import { LearningObjectsService } from './learning-objects.service';

@Controller('learning-object-filters')
@UseGuards(AuthGuard)
export class LearningObjectFiltersController {
  constructor(
    private readonly service: LearningObjectsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @Public()
  async getFacets(@Query('scope') scope?: string, @Req() request?: Request) {
    const isAdminScope = scope === 'admin';
    if (isAdminScope) {
      await this.authService.validateBearerToken(
        request?.headers.authorization,
      );
    }

    return this.service.getFilterFacets(isAdminScope);
  }
}
