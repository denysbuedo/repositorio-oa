import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from '../analytics/analytics.service';
import { UsageEventType } from '../analytics/entities/usage-event.entity';
import { LtiService } from './lti.service';
import type { OidcLoginParams } from './lti.service';

interface LtiLaunchBody {
  custom_object_id?: string;
}

@Controller('lti')
export class LtiController {
  constructor(
    private readonly ltiService: LtiService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('jwks')
  getJwks() {
    return this.ltiService.getJwks();
  }

  @Get('login')
  async login(@Query() query: OidcLoginParams, @Res() res: Response) {
    const redirectUrl = await this.ltiService.validateOidcLogin(query);
    return res.redirect(redirectUrl);
  }

  @Post('launch')
  async launch(@Body() body: LtiLaunchBody, @Res() res: Response) {
    const objectId = body.custom_object_id;
    if (!objectId) {
      throw new BadRequestException('custom_object_id is required');
    }

    await this.analyticsService.recordEvent({
      learningObjectId: objectId,
      eventType: UsageEventType.LTI_LAUNCH,
      source: 'lti',
    });

    return res.redirect(this.ltiService.buildLaunchRedirectUrl(objectId));
  }
}
