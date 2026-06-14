import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearningObjectsService } from './learning-objects.service';
import { LearningObject } from './entities/learning-object.entity';
import { LearningObjectVersion } from './entities/learning-object-version.entity';
import { Collection } from '../collections/entities/collection.entity';

describe('LearningObjectsService', () => {
  let service: LearningObjectsService;
  const repositoryMock = {
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };
  const versionRepositoryMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const collectionRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningObjectsService,
        {
          provide: getRepositoryToken(LearningObject),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(LearningObjectVersion),
          useValue: versionRepositoryMock,
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: collectionRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<LearningObjectsService>(LearningObjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
