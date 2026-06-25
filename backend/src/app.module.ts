import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LearningObjectsModule } from './learning-objects/learning-objects.module';
import { LearningObject } from './learning-objects/entities/learning-object.entity';
import { LearningObjectVersion } from './learning-objects/entities/learning-object-version.entity';
import { LearningObjectPreservationEvent } from './learning-objects/entities/learning-object-preservation-event.entity';
import { Collection } from './collections/entities/collection.entity';
import { AiService } from './ai/ai.service';
import { LtiModule } from './lti/lti.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { OaiModule } from './oai/oai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT') ?? 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [
          LearningObject,
          LearningObjectVersion,
          LearningObjectPreservationEvent,
          Collection,
        ],
        synchronize: configService.get<string>('DB_SYNC') === 'true',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CollectionsModule,
    LearningObjectsModule,
    LtiModule,
    OaiModule,
  ],
  controllers: [AppController],
  providers: [AppService, AiService],
})
export class AppModule {}
