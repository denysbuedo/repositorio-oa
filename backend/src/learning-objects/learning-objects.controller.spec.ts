import { Test, TestingModule } from '@nestjs/testing';
import { LearningObjectsController } from './learning-objects.controller';
import { LearningObjectsService } from './learning-objects.service';
import { AiService } from '../ai/ai.service';

describe('LearningObjectsController', () => {
  let controller: LearningObjectsController;
  const learningObjectsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getObjectHtml: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    updateFileReference: jest.fn(),
  };
  const aiServiceMock = {
    extractText: jest.fn(),
    generateMetadata: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningObjectsController],
      providers: [
        {
          provide: LearningObjectsService,
          useValue: learningObjectsServiceMock,
        },
        {
          provide: AiService,
          useValue: aiServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LearningObjectsController>(
      LearningObjectsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
