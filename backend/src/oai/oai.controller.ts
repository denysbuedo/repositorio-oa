import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { OaiService } from './oai.service';

@Controller('oai')
export class OaiController {
  constructor(private readonly service: OaiService) {}

  @Get()
  @Public()
  async handle(
    @Query('verb') verb: string | undefined,
    @Query('identifier') identifier: string | undefined,
    @Query('metadataPrefix') metadataPrefix: string | undefined,
    @Query('set') set: string | undefined,
    @Res() response: Response,
  ) {
    const xml = await this.service.handle({
      verb,
      identifier,
      metadataPrefix,
      set,
    });

    response.type('application/xml').send(xml);
  }
}
