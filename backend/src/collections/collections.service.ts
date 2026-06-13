import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly repository: Repository<Collection>,
  ) {}

  async findAll(): Promise<Collection[]> {
    return this.repository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Collection> {
    const collection = await this.repository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Coleccion con ID ${id} no encontrada`);
    }
    return collection;
  }

  async create(dto: CreateCollectionDto): Promise<Collection> {
    const name = dto.name.trim();
    await this.ensureNameIsAvailable(name);

    const collection = this.repository.create({
      name,
      description: dto.description?.trim() || null,
    });
    return this.repository.save(collection);
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<Collection> {
    const collection = await this.findOne(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      await this.ensureNameIsAvailable(name, id);
      collection.name = name;
    }

    if (dto.description !== undefined) {
      collection.description = dto.description.trim() || null;
    }

    return this.repository.save(collection);
  }

  async remove(id: string): Promise<void> {
    const collection = await this.findOne(id);
    await this.repository.remove(collection);
  }

  private async ensureNameIsAvailable(name: string, currentId?: string) {
    const existing = await this.repository.findOne({ where: { name } });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Ya existe una coleccion con ese nombre');
    }
  }
}
