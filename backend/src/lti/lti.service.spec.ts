import { Test, TestingModule } from '@nestjs/testing';
import { LtiService } from './lti.service';
import { LtiPlatformsService } from './lti-platforms.service';

jest.mock('jose', () => ({
  exportJWK: jest.fn().mockResolvedValue({ kty: 'RSA' }),
  generateKeyPair: jest.fn().mockResolvedValue({
    privateKey: {},
    publicKey: {},
  }),
}));

describe('LtiService', () => {
  let service: LtiService;
  const platformsServiceMock = {
    findEnabledByIssuer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LtiService,
        {
          provide: LtiPlatformsService,
          useValue: platformsServiceMock,
        },
      ],
    }).compile();

    service = module.get<LtiService>(LtiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
