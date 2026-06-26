import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageEvent, UsageEventType } from './entities/usage-event.entity';
import { LearningObject } from '../learning-objects/entities/learning-object.entity';
import { CreateUsageEventDto } from './dto/usage-event.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UsageEvent)
    private readonly usageEventRepository: Repository<UsageEvent>,
    @InjectRepository(LearningObject)
    private readonly learningObjectRepository: Repository<LearningObject>,
  ) {}

  async recordEvent(dto: CreateUsageEventDto) {
    const exists = await this.learningObjectRepository.exists({
      where: { id: dto.learningObjectId },
    });
    if (!exists) return null;

    const event = this.usageEventRepository.create({
      learningObjectId: dto.learningObjectId,
      eventType: dto.eventType,
      source: dto.source?.trim() || null,
      context: dto.context ?? null,
    });
    return await this.usageEventRepository.save(event);
  }

  async getSummary() {
    const counts = await this.usageEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.eventType')
      .getRawMany<{ eventType: UsageEventType; count: string }>();

    const topObjects = await this.usageEventRepository
      .createQueryBuilder('event')
      .innerJoin('event.learningObject', 'object')
      .select('event.learningObjectId', 'learningObjectId')
      .addSelect('object.title', 'title')
      .addSelect('COUNT(*)', 'totalEvents')
      .addSelect(
        `SUM(CASE WHEN event."eventType" = '${UsageEventType.VIEW}' THEN 1 ELSE 0 END)`,
        'views',
      )
      .addSelect(
        `SUM(CASE WHEN event."eventType" = '${UsageEventType.DOWNLOAD}' THEN 1 ELSE 0 END)`,
        'downloads',
      )
      .addSelect(
        `SUM(CASE WHEN event."eventType" = '${UsageEventType.LTI_LAUNCH}' THEN 1 ELSE 0 END)`,
        'ltiLaunches',
      )
      .groupBy('event.learningObjectId')
      .addGroupBy('object.title')
      .orderBy('"totalEvents"', 'DESC')
      .limit(5)
      .getRawMany<{
        learningObjectId: string;
        title: string;
        totalEvents: string;
        views: string;
        downloads: string;
        ltiLaunches: string;
      }>();

    const byType = {
      views: 0,
      downloads: 0,
      ltiLaunches: 0,
      totalEvents: 0,
    };

    for (const row of counts) {
      const count = Number(row.count);
      byType.totalEvents += count;
      if (row.eventType === UsageEventType.VIEW) byType.views = count;
      if (row.eventType === UsageEventType.DOWNLOAD) byType.downloads = count;
      if (row.eventType === UsageEventType.LTI_LAUNCH) {
        byType.ltiLaunches = count;
      }
    }

    return {
      ...byType,
      topObjects: topObjects.map((row) => ({
        learningObjectId: row.learningObjectId,
        title: row.title,
        totalEvents: Number(row.totalEvents),
        views: Number(row.views),
        downloads: Number(row.downloads),
        ltiLaunches: Number(row.ltiLaunches),
      })),
    };
  }
}
