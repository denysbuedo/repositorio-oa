import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const checks = {
      database: await this.checkDatabase(),
      uploads: this.checkUploadsDirectory(),
    };
    const status = Object.values(checks).every((check) => check.status === 'ok')
      ? 'ok'
      : 'degraded';

    return {
      status,
      service: 'repositorio-oa-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database error',
      };
    }
  }

  private checkUploadsDirectory() {
    return existsSync('uploads')
      ? { status: 'ok' }
      : {
          status: 'warning',
          message: 'Uploads directory not found',
        };
  }
}
