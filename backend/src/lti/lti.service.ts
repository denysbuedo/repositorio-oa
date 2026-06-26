import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createRemoteJWKSet,
  decodeJwt,
  exportJWK,
  generateKeyPair,
  GenerateKeyPairResult,
  JWTPayload,
  jwtVerify,
  SignJWT,
} from 'jose';
import * as crypto from 'crypto';
import type { LearningObject } from '../learning-objects/entities/learning-object.entity';
import { LtiPlatformsService } from './lti-platforms.service';
import type { LtiPlatform } from './entities/lti-platform.entity';

export interface JwksResponse {
  keys: Array<Record<string, unknown>>;
}

export interface OidcLoginParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint: string;
}

export interface ValidatedLtiLaunch {
  objectId: string;
  platformId: string;
  issuer: string;
  deploymentId?: string | null;
  context?: {
    id?: string;
    label?: string;
    title?: string;
    type?: unknown;
  };
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  roles?: unknown;
}

export interface ValidatedDeepLinkingLaunch {
  platformId: string;
  issuer: string;
  deploymentId?: string | null;
  deepLinkReturnUrl: string;
  data?: string;
  context?: ValidatedLtiLaunch['context'];
  user?: ValidatedLtiLaunch['user'];
  roles?: unknown;
}

const LTI_DEPLOYMENT_ID_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const LTI_CUSTOM_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/custom';
const LTI_CONTEXT_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/context';
const LTI_ROLES_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/roles';
const LTI_MESSAGE_TYPE_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/message_type';
const LTI_VERSION_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/version';
const LTI_DEEP_LINKING_SETTINGS_CLAIM =
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings';
const LTI_CONTENT_ITEMS_CLAIM =
  'https://purl.imsglobal.org/spec/lti-dl/claim/content_items';
const DEEP_LINK_SESSION_AUDIENCE = 'roa-deep-link-session';

@Injectable()
export class LtiService implements OnModuleInit {
  private keys: GenerateKeyPairResult;
  private jwks: JwksResponse = { keys: [] };
  private readonly remoteJwkSets = new Map<
    string,
    ReturnType<typeof createRemoteJWKSet>
  >();
  private readonly frontendUrl =
    process.env.FRONTEND_URL ?? 'http://localhost:3000';
  private readonly fallbackClientId =
    process.env.LTI_CLIENT_ID ?? 'moodle_client_id';

  constructor(private readonly platformsService: LtiPlatformsService) {}

  async onModuleInit() {
    this.keys = await generateKeyPair('RS256');

    const jwk = await exportJWK(this.keys.publicKey);
    this.jwks = {
      keys: [
        {
          ...jwk,
          kid: 'roa-key-1',
          use: 'sig',
          alg: 'RS256',
        },
      ],
    };
  }

  getJwks(): JwksResponse {
    return this.jwks;
  }

  async validateOidcLogin(params: OidcLoginParams): Promise<string> {
    const { iss, login_hint, target_link_uri, lti_message_hint } = params;
    const platform = await this.platformsService.findEnabledByIssuer(iss);

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const redirectUrl = new URL(platform?.authLoginUrl || iss);

    redirectUrl.searchParams.append('response_type', 'id_token');
    redirectUrl.searchParams.append('response_mode', 'form_post');
    redirectUrl.searchParams.append('id_token_signed_response_alg', 'RS256');
    redirectUrl.searchParams.append('scope', 'openid');
    redirectUrl.searchParams.append(
      'client_id',
      platform?.clientId || this.fallbackClientId,
    );
    redirectUrl.searchParams.append('login_hint', login_hint);
    redirectUrl.searchParams.append('lti_message_hint', lti_message_hint);
    redirectUrl.searchParams.append('prompt', 'none');
    redirectUrl.searchParams.append('redirect_uri', target_link_uri);
    redirectUrl.searchParams.append('state', state);
    redirectUrl.searchParams.append('nonce', nonce);

    return redirectUrl.toString();
  }

  async validateLaunchToken(idToken: string): Promise<ValidatedLtiLaunch> {
    const { platform, payload, deploymentId } =
      await this.verifyRegisteredPlatformToken(idToken);

    const custom = getRecordClaim(payload, LTI_CUSTOM_CLAIM);
    const objectId =
      getStringValue(custom, 'custom_object_id') ??
      getStringValue(custom, 'object_id') ??
      getStringValue(custom, 'learning_object_id');

    if (!objectId) {
      throw new BadRequestException(
        'El launch LTI no incluye custom_object_id',
      );
    }

    const context = getRecordClaim(payload, LTI_CONTEXT_CLAIM);

    return {
      objectId,
      platformId: platform.id,
      issuer: platform.issuer,
      deploymentId,
      context: context
        ? {
            id: getStringValue(context, 'id'),
            label: getStringValue(context, 'label'),
            title: getStringValue(context, 'title'),
            type: context.type,
          }
        : undefined,
      user: {
        id: payload.sub,
        name: getStringClaim(payload, 'name'),
        email: getStringClaim(payload, 'email'),
      },
      roles: payload[LTI_ROLES_CLAIM],
    };
  }

  async validateDeepLinkingToken(
    idToken: string,
  ): Promise<ValidatedDeepLinkingLaunch> {
    const { platform, payload, deploymentId } =
      await this.verifyRegisteredPlatformToken(idToken);
    const messageType = getStringClaim(payload, LTI_MESSAGE_TYPE_CLAIM);
    if (messageType !== 'LtiDeepLinkingRequest') {
      throw new BadRequestException('El launch no es Deep Linking');
    }

    const settings = getRecordClaim(payload, LTI_DEEP_LINKING_SETTINGS_CLAIM);
    const deepLinkReturnUrl = getStringValue(settings, 'deep_link_return_url');
    if (!deepLinkReturnUrl) {
      throw new BadRequestException(
        'El launch Deep Linking no incluye deep_link_return_url',
      );
    }

    const context = getRecordClaim(payload, LTI_CONTEXT_CLAIM);

    return {
      platformId: platform.id,
      issuer: platform.issuer,
      deploymentId,
      deepLinkReturnUrl,
      data: getStringValue(settings, 'data'),
      context: context
        ? {
            id: getStringValue(context, 'id'),
            label: getStringValue(context, 'label'),
            title: getStringValue(context, 'title'),
            type: context.type,
          }
        : undefined,
      user: {
        id: payload.sub,
        name: getStringClaim(payload, 'name'),
        email: getStringClaim(payload, 'email'),
      },
      roles: payload[LTI_ROLES_CLAIM],
    };
  }

  async createDeepLinkingSession(launch: ValidatedDeepLinkingLaunch) {
    return await new SignJWT({
      platformId: launch.platformId,
      issuer: launch.issuer,
      deploymentId: launch.deploymentId,
      deepLinkReturnUrl: launch.deepLinkReturnUrl,
      data: launch.data,
      context: launch.context,
      user: launch.user,
      roles: launch.roles,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'roa-key-1' })
      .setIssuer(this.getToolIssuer())
      .setAudience(DEEP_LINK_SESSION_AUDIENCE)
      .setSubject(launch.platformId)
      .setExpirationTime('15m')
      .setIssuedAt()
      .sign(this.keys.privateKey);
  }

  async buildDeepLinkingResponse(sessionToken: string, object: LearningObject) {
    const { payload } = await jwtVerify(sessionToken, this.keys.publicKey, {
      issuer: this.getToolIssuer(),
      audience: DEEP_LINK_SESSION_AUDIENCE,
    });

    const platformId = getStringClaim(payload, 'platformId');
    if (!platformId) {
      throw new BadRequestException('Sesion Deep Linking invalida');
    }

    const platform = await this.platformsService.findOne(platformId);
    const returnUrl = getStringClaim(payload, 'deepLinkReturnUrl');
    if (!returnUrl) {
      throw new BadRequestException('Sesion Deep Linking sin return URL');
    }

    const deploymentId = getStringClaim(payload, 'deploymentId');
    const data = getStringClaim(payload, 'data');
    const selectedObjectUrl = this.buildLaunchRedirectUrl(object.id);
    const responsePayload: JWTPayload = {
      [LTI_MESSAGE_TYPE_CLAIM]: 'LtiDeepLinkingResponse',
      [LTI_VERSION_CLAIM]: '1.3.0',
      [LTI_DEPLOYMENT_ID_CLAIM]: deploymentId,
      [LTI_CONTENT_ITEMS_CLAIM]: [
        {
          type: 'ltiResourceLink',
          title: object.title,
          text: object.description ?? object.title,
          url: selectedObjectUrl,
          custom: {
            custom_object_id: object.id,
          },
        },
      ],
      data,
      nonce: crypto.randomUUID(),
    };

    const jwt = await new SignJWT(responsePayload)
      .setProtectedHeader({ alg: 'RS256', kid: 'roa-key-1' })
      .setIssuer(this.getToolIssuer())
      .setAudience(platform.issuer)
      .setExpirationTime('5m')
      .setIssuedAt()
      .sign(this.keys.privateKey);

    return {
      jwt,
      returnUrl,
    };
  }

  buildLaunchRedirectUrl(objectId: string): string {
    const redirectUrl = new URL('/lti/view', this.frontendUrl);
    redirectUrl.searchParams.set('objectId', objectId);
    return redirectUrl.toString();
  }

  buildDeepLinkingRedirectUrl(sessionToken: string): string {
    const redirectUrl = new URL('/lti/deep-link', this.frontendUrl);
    redirectUrl.searchParams.set('session', sessionToken);
    return redirectUrl.toString();
  }

  private async verifyRegisteredPlatformToken(idToken: string): Promise<{
    platform: LtiPlatform;
    payload: JWTPayload;
    deploymentId?: string | null;
  }> {
    let decoded: JWTPayload;
    try {
      decoded = decodeJwt(idToken);
    } catch {
      throw new BadRequestException('id_token LTI invalido');
    }

    const issuer = decoded.iss;
    if (!issuer) {
      throw new UnauthorizedException('El launch LTI no declara issuer');
    }

    const platform = await this.platformsService.findEnabledByIssuer(issuer);
    if (!platform) {
      throw new UnauthorizedException(
        'Plataforma LTI no registrada o inactiva',
      );
    }

    if (!platform.jwksUrl) {
      throw new BadRequestException(
        'La plataforma LTI no tiene JWKS URL configurada',
      );
    }

    const { payload } = await jwtVerify(
      idToken,
      this.getRemoteJwkSet(platform.jwksUrl),
      {
        issuer: platform.issuer,
        audience: platform.clientId,
      },
    );

    const deploymentId = getStringClaim(payload, LTI_DEPLOYMENT_ID_CLAIM);
    if (platform.deploymentId && deploymentId !== platform.deploymentId) {
      throw new UnauthorizedException(
        'El deployment ID del launch LTI no coincide',
      );
    }

    return { platform, payload, deploymentId };
  }

  private getRemoteJwkSet(jwksUrl: string) {
    const cached = this.remoteJwkSets.get(jwksUrl);
    if (cached) return cached;

    const jwkSet = createRemoteJWKSet(new URL(jwksUrl));
    this.remoteJwkSets.set(jwksUrl, jwkSet);
    return jwkSet;
  }

  private getToolIssuer() {
    return process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  }
}

function getStringClaim(payload: JWTPayload, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function getRecordClaim(payload: JWTPayload, key: string) {
  const value = payload[key];
  return isRecord(value) ? value : undefined;
}

function getStringValue(
  record: Record<string, unknown> | undefined,
  key: string,
) {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
