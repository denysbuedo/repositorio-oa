import { Test, TestingModule } from '@nestjs/testing';
import { LtiService } from './lti.service';
import { LtiPlatformsService } from './lti-platforms.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  decodeJwt: jest.fn(),
  exportJWK: jest.fn().mockResolvedValue({ kty: 'RSA' }),
  generateKeyPair: jest.fn().mockResolvedValue({
    privateKey: {},
    publicKey: {},
  }),
  jwtVerify: jest.fn(),
}));

import { decodeJwt, jwtVerify } from 'jose';

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

  it('validates a launch token and extracts LTI context', async () => {
    jest.mocked(decodeJwt).mockReturnValue({ iss: 'https://lms.test' });
    platformsServiceMock.findEnabledByIssuer.mockResolvedValue({
      id: 'platform-1',
      issuer: 'https://lms.test',
      clientId: 'client-1',
      deploymentId: 'deployment-1',
      jwksUrl: 'https://lms.test/jwks',
    });
    jest.mocked(jwtVerify).mockResolvedValue({
      payload: {
        iss: 'https://lms.test',
        aud: 'client-1',
        sub: 'user-1',
        name: 'Test User',
        email: 'test@example.edu',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id':
          'deployment-1',
        'https://purl.imsglobal.org/spec/lti/claim/custom': {
          custom_object_id: 'object-1',
        },
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'course-1',
          label: 'BD101',
          title: 'Base de datos',
        },
        'https://purl.imsglobal.org/spec/lti/claim/roles': [
          'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
        ],
      },
      protectedHeader: {},
    });

    await expect(service.validateLaunchToken('token')).resolves.toMatchObject({
      objectId: 'object-1',
      platformId: 'platform-1',
      issuer: 'https://lms.test',
      deploymentId: 'deployment-1',
      context: {
        id: 'course-1',
        label: 'BD101',
        title: 'Base de datos',
      },
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.edu',
      },
    });
  });
});
