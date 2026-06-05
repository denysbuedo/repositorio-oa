import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LearningObjectsService } from './learning-objects.service';
import { LearningObject } from './entities/learning-object.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningObjectsService,
        {
          provide: getRepositoryToken(LearningObject),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<LearningObjectsService>(LearningObjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
