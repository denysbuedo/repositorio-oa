import { Test, TestingModule } from '@nestjs/testing';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { LearningObjectsService } from '../learning-objects/learning-objects.service';

jest.mock('jose', () => ({
  exportJWK: jest.fn().mockResolvedValue({ kty: 'RSA' }),
  generateKeyPair: jest.fn().mockResolvedValue({
    privateKey: {},
    publicKey: {},
  }),
}));

describe('LtiController', () => {
  let controller: LtiController;
  const ltiServiceMock = {
    getJwks: jest.fn(),
    validateOidcLogin: jest.fn(),
    buildLaunchRedirectUrl: jest.fn(),
    validateDeepLinkingToken: jest.fn(),
    createDeepLinkingSession: jest.fn(),
    buildDeepLinkingRedirectUrl: jest.fn(),
    buildDeepLinkingResponse: jest.fn(),
  };
  const analyticsServiceMock = {
    recordEvent: jest.fn(),
  };
  const learningObjectsServiceMock = {
    findPublishedOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LtiController],
      providers: [
        {
          provide: LtiService,
          useValue: ltiServiceMock,
        },
        {
          provide: AnalyticsService,
          useValue: analyticsServiceMock,
        },
        {
          provide: LearningObjectsService,
          useValue: learningObjectsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LtiController>(LtiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
