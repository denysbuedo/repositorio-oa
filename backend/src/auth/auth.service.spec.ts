import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const jwtServiceMock = {
    signAsync: jest.fn().mockResolvedValue('token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                ADMIN_USERNAME: 'admin',
                ADMIN_PASSWORD: 'admin123',
              };
              return values[key];
            }),
          },
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return a token for valid credentials', async () => {
    await expect(
      service.login({ username: 'admin', password: 'admin123' }),
    ).resolves.toEqual({
      accessToken: 'token',
      user: {
        username: 'admin',
        role: 'admin',
      },
    });
  });
});
