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
} from 'jose';
import * as crypto from 'crypto';
import { LtiPlatformsService } from './lti-platforms.service';

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

const LTI_DEPLOYMENT_ID_CLAIM =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const LTI_CUSTOM_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/custom';
const LTI_CONTEXT_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/context';
const LTI_ROLES_CLAIM = 'https://purl.imsglobal.org/spec/lti/claim/roles';

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

  buildLaunchRedirectUrl(objectId: string): string {
    const redirectUrl = new URL('/lti/view', this.frontendUrl);
    redirectUrl.searchParams.set('objectId', objectId);
    return redirectUrl.toString();
  }

  private getRemoteJwkSet(jwksUrl: string) {
    const cached = this.remoteJwkSets.get(jwksUrl);
    if (cached) return cached;

    const jwkSet = createRemoteJWKSet(new URL(jwksUrl));
    this.remoteJwkSets.set(jwksUrl, jwkSet);
    return jwkSet;
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
