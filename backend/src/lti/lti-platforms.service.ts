import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateLtiPlatformDto,
  UpdateLtiPlatformDto,
} from './dto/lti-platform.dto';
import { LtiPlatform } from './entities/lti-platform.entity';

@Injectable()
export class LtiPlatformsService {
  constructor(
    @InjectRepository(LtiPlatform)
    private readonly repository: Repository<LtiPlatform>,
  ) {}

  findAll() {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const platform = await this.repository.findOne({ where: { id } });
    if (!platform) {
      throw new NotFoundException(`Plataforma LTI con ID ${id} no encontrada`);
    }
    return platform;
  }

  async findEnabledByIssuer(issuer: string) {
    return this.repository.findOne({
      where: { issuer: issuer.trim(), enabled: true },
    });
  }

  async create(dto: CreateLtiPlatformDto) {
    const issuer = dto.issuer.trim();
    await this.ensureIssuerIsAvailable(issuer);

    const platform = this.repository.create({
      name: dto.name.trim(),
      issuer,
      clientId: dto.clientId.trim(),
      deploymentId: normalizeOptional(dto.deploymentId),
      authLoginUrl: normalizeOptional(dto.authLoginUrl),
      authTokenUrl: normalizeOptional(dto.authTokenUrl),
      jwksUrl: normalizeOptional(dto.jwksUrl),
      enabled: dto.enabled ?? true,
      notes: normalizeOptional(dto.notes),
    });
    return this.repository.save(platform);
  }

  async update(id: string, dto: UpdateLtiPlatformDto) {
    const platform = await this.findOne(id);

    if (dto.issuer !== undefined) {
      const issuer = dto.issuer.trim();
      await this.ensureIssuerIsAvailable(issuer, id);
      platform.issuer = issuer;
    }

    if (dto.name !== undefined) platform.name = dto.name.trim();
    if (dto.clientId !== undefined) platform.clientId = dto.clientId.trim();
    if (dto.deploymentId !== undefined) {
      platform.deploymentId = normalizeOptional(dto.deploymentId);
    }
    if (dto.authLoginUrl !== undefined) {
      platform.authLoginUrl = normalizeOptional(dto.authLoginUrl);
    }
    if (dto.authTokenUrl !== undefined) {
      platform.authTokenUrl = normalizeOptional(dto.authTokenUrl);
    }
    if (dto.jwksUrl !== undefined) {
      platform.jwksUrl = normalizeOptional(dto.jwksUrl);
    }
    if (dto.enabled !== undefined) platform.enabled = dto.enabled;
    if (dto.notes !== undefined) platform.notes = normalizeOptional(dto.notes);

    return this.repository.save(platform);
  }

  async remove(id: string) {
    const platform = await this.findOne(id);
    await this.repository.remove(platform);
  }

  private async ensureIssuerIsAvailable(issuer: string, currentId?: string) {
    const existing = await this.repository.findOne({ where: { issuer } });
    if (existing && existing.id !== currentId) {
      throw new ConflictException(
        'Ya existe una plataforma LTI con ese issuer',
      );
    }
  }
}

function normalizeOptional(value?: string | null) {
  return value?.trim() || null;
}
