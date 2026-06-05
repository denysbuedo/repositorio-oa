import { Controller, Get, Post, Query, Res, Body } from '@nestjs/common';
import { LtiService } from './lti.service';
import type { OidcLoginParams } from './lti.service';
import type { Response } from 'express';

interface LtiLaunchBody {
  custom_object_id?: string;
}

@Controller('lti')
export class LtiController {
  constructor(private readonly ltiService: LtiService) {}

  /**
   * Endpoint de JWKS: El LMS consulta este endpoint para obtener
   * nuestra llave pública y verificar la firma de nuestros mensajes.
   */
  @Get('jwks')
  getJwks() {
    return this.ltiService.getJwks();
  }

  /**
   * OIDC Login Initiation: Primer paso del protocolo LTI 1.3.
   */
  @Get('login')
  login(@Query() query: OidcLoginParams, @Res() res: Response) {
    const redirectUrl = this.ltiService.validateOidcLogin(query);
    return res.redirect(redirectUrl);
  }

  /**
   * LTI Launch: Punto donde el LMS envía la petición de visualización.
   */
  @Post('launch')
  launch(@Body() body: LtiLaunchBody, @Res() res: Response) {
    // Extraemos el ID del objeto que el "LMS" nos pide mostrar
    const objectId = body.custom_object_id;

    // En un flujo real, aquí validaríamos el JWT del LMS.
    // Redirigimos al visor específico en el frontend.
    return res.redirect(`http://localhost:3000/lti/view?objectId=${objectId}`);
  }
}
