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
import { LearningObjectsService } from '../learning-objects/learning-objects.service';
import { LtiService } from './lti.service';
import type { OidcLoginParams } from './lti.service';

interface LtiLaunchBody {
  id_token?: string;
  custom_object_id?: string;
}

interface DeepLinkingSelectionBody {
  sessionToken?: string;
  objectId?: string;
}

@Controller('lti')
export class LtiController {
  constructor(
    private readonly ltiService: LtiService,
    private readonly analyticsService: AnalyticsService,
    private readonly learningObjectsService: LearningObjectsService,
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

  @Post('deep-linking-launch')
  async deepLinkingLaunch(@Body() body: LtiLaunchBody, @Res() res: Response) {
    if (!body.id_token) {
      throw new BadRequestException('id_token is required');
    }

    const launch = await this.ltiService.validateDeepLinkingToken(
      body.id_token,
    );
    const sessionToken = await this.ltiService.createDeepLinkingSession(launch);
    return res.redirect(
      this.ltiService.buildDeepLinkingRedirectUrl(sessionToken),
    );
  }

  @Post('deep-linking-response')
  async deepLinkingResponse(@Body() body: DeepLinkingSelectionBody) {
    if (!body.sessionToken || !body.objectId) {
      throw new BadRequestException('sessionToken and objectId are required');
    }

    const object = await this.learningObjectsService.findPublishedOne(
      body.objectId,
    );
    return this.ltiService.buildDeepLinkingResponse(body.sessionToken, object);
  }
}
