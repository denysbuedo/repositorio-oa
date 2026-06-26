import { Test, TestingModule } from '@nestjs/testing';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';
import { AnalyticsService } from '../analytics/analytics.service';

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
  };
  const analyticsServiceMock = {
    recordEvent: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<LtiController>(LtiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
