import { Injectable, OnModuleInit } from '@nestjs/common';
import { exportJWK, generateKeyPair, GenerateKeyPairResult } from 'jose';
import * as crypto from 'crypto';

export interface JwksResponse {
  keys: Array<Record<string, unknown>>;
}

export interface OidcLoginParams {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint: string;
}

@Injectable()
export class LtiService implements OnModuleInit {
  private keys: GenerateKeyPairResult;
  private jwks: JwksResponse = { keys: [] };
  private readonly frontendUrl =
    process.env.FRONTEND_URL ?? 'http://localhost:3000';
  private readonly clientId = process.env.LTI_CLIENT_ID ?? 'moodle_client_id';

  async onModuleInit() {
    // Generar par de llaves directamente
    this.keys = await generateKeyPair('RS256');

    // Generar el JWKS público desde la llave pública
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

  validateOidcLogin(params: OidcLoginParams): string {
    const { iss, login_hint, target_link_uri, lti_message_hint } = params;

    // Usamos el módulo nativo solo para generar IDs aleatorios
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    const redirectUrl = new URL(iss);
    redirectUrl.searchParams.append('response_type', 'id_token');
    redirectUrl.searchParams.append('response_mode', 'form_post');
    redirectUrl.searchParams.append('id_token_signed_response_alg', 'RS256');
    redirectUrl.searchParams.append('scope', 'openid');
    redirectUrl.searchParams.append('client_id', this.clientId);
    redirectUrl.searchParams.append('login_hint', login_hint);
    redirectUrl.searchParams.append('lti_message_hint', lti_message_hint);
    redirectUrl.searchParams.append('prompt', 'none');
    redirectUrl.searchParams.append('redirect_uri', target_link_uri);
    redirectUrl.searchParams.append('state', state);
    redirectUrl.searchParams.append('nonce', nonce);

    return redirectUrl.toString();
  }

  buildLaunchRedirectUrl(objectId: string): string {
    const redirectUrl = new URL('/lti/view', this.frontendUrl);
    redirectUrl.searchParams.set('objectId', objectId);
    return redirectUrl.toString();
  }
}
