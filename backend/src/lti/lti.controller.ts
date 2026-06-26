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
  id_token?: string;
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
    const validatedLaunch = body.id_token
      ? await this.ltiService.validateLaunchToken(body.id_token)
      : null;
    const objectId = validatedLaunch?.objectId ?? body.custom_object_id;

    if (!objectId) {
      throw new BadRequestException('custom_object_id or id_token is required');
    }

    await this.analyticsService.recordEvent({
      learningObjectId: objectId,
      eventType: UsageEventType.LTI_LAUNCH,
      source: 'lti',
      context: validatedLaunch
        ? {
            platformId: validatedLaunch.platformId,
            issuer: validatedLaunch.issuer,
            deploymentId: validatedLaunch.deploymentId,
            course: validatedLaunch.context,
            user: validatedLaunch.user,
            roles: validatedLaunch.roles,
          }
        : undefined,
    });

    return res.redirect(this.ltiService.buildLaunchRedirectUrl(objectId));
  }
}
