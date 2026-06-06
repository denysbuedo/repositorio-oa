import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './auth.dto';

interface AdminJwtPayload {
  sub: string;
  role: 'admin';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const adminUsername =
      this.configService.get<string>('ADMIN_USERNAME') ?? 'admin';
    const adminPassword =
      this.configService.get<string>('ADMIN_PASSWORD') ?? 'admin123';

    if (
      loginDto.username !== adminUsername ||
      loginDto.password !== adminPassword
    ) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const payload: AdminJwtPayload = {
      sub: adminUsername,
      role: 'admin',
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        username: adminUsername,
        role: 'admin',
      },
    };
  }
}
