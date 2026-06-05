import { Test, TestingModule } from '@nestjs/testing';
import { LtiService } from './lti.service';

jest.mock('jose', () => ({
  exportJWK: jest.fn().mockResolvedValue({ kty: 'RSA' }),
  generateKeyPair: jest.fn().mockResolvedValue({
    privateKey: {},
    publicKey: {},
  }),
}));

describe('LtiService', () => {
  let service: LtiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LtiService],
    }).compile();

    service = module.get<LtiService>(LtiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
