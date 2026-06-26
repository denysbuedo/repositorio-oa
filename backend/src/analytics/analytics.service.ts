import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsageEvent, UsageEventType } from './entities/usage-event.entity';
import { LearningObject } from '../learning-objects/entities/learning-object.entity';
import { CreateUsageEventDto } from './dto/usage-event.dto';

export interface AnalyticsFilters {
  days?: number;
  source?: string;
}

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

  async getSummary(filters: AnalyticsFilters = {}) {
    const normalizedFilters = normalizeAnalyticsFilters(filters);
    const baseQuery = this.applyFilters(
      this.usageEventRepository.createQueryBuilder('event'),
      normalizedFilters,
    );

    const counts = await baseQuery
      .clone()
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.eventType')
      .getRawMany<{ eventType: UsageEventType; count: string }>();

    const topObjects = await baseQuery
      .clone()
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

    const bySource = await baseQuery
      .clone()
      .select("COALESCE(event.source, 'sin_origen')", 'source')
      .addSelect('COUNT(*)', 'totalEvents')
      .groupBy("COALESCE(event.source, 'sin_origen')")
      .orderBy('"totalEvents"', 'DESC')
      .limit(10)
      .getRawMany<{ source: string; totalEvents: string }>();

    const byPlatform = await baseQuery
      .clone()
      .select("event.context->>'platformId'", 'platformId')
      .addSelect("event.context->>'issuer'", 'issuer')
      .addSelect('COUNT(*)', 'totalEvents')
      .andWhere("event.context->>'platformId' IS NOT NULL")
      .groupBy("event.context->>'platformId'")
      .addGroupBy("event.context->>'issuer'")
      .orderBy('"totalEvents"', 'DESC')
      .limit(10)
      .getRawMany<{
        platformId: string;
        issuer: string | null;
        totalEvents: string;
      }>();

    const byCourse = await baseQuery
      .clone()
      .select("event.context->'course'->>'id'", 'courseId')
      .addSelect(
        "COALESCE(event.context->'course'->>'title', event.context->'course'->>'label', 'Curso sin titulo')",
        'courseTitle',
      )
      .addSelect('COUNT(*)', 'totalEvents')
      .andWhere("event.context->'course'->>'id' IS NOT NULL")
      .groupBy("event.context->'course'->>'id'")
      .addGroupBy(
        "COALESCE(event.context->'course'->>'title', event.context->'course'->>'label', 'Curso sin titulo')",
      )
      .orderBy('"totalEvents"', 'DESC')
      .limit(10)
      .getRawMany<{
        courseId: string;
        courseTitle: string;
        totalEvents: string;
      }>();

    const daily = await baseQuery
      .clone()
      .select(
        `to_char(date_trunc('day', event."createdAt"), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect('COUNT(*)', 'totalEvents')
      .groupBy(`date_trunc('day', event."createdAt")`)
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; totalEvents: string }>();

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
      filters: normalizedFilters,
      topObjects: topObjects.map((row) => ({
        learningObjectId: row.learningObjectId,
        title: row.title,
        totalEvents: Number(row.totalEvents),
        views: Number(row.views),
        downloads: Number(row.downloads),
        ltiLaunches: Number(row.ltiLaunches),
      })),
      bySource: bySource.map((row) => ({
        source: row.source,
        totalEvents: Number(row.totalEvents),
      })),
      byPlatform: byPlatform.map((row) => ({
        platformId: row.platformId,
        issuer: row.issuer,
        totalEvents: Number(row.totalEvents),
      })),
      byCourse: byCourse.map((row) => ({
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        totalEvents: Number(row.totalEvents),
      })),
      daily: daily.map((row) => ({
        date: row.date,
        totalEvents: Number(row.totalEvents),
      })),
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<UsageEvent>,
    filters: Required<AnalyticsFilters>,
  ) {
    const from = new Date();
    from.setDate(from.getDate() - filters.days);
    queryBuilder.where('event.createdAt >= :from', { from });

    if (filters.source && filters.source !== 'all') {
      queryBuilder.andWhere('event.source = :source', {
        source: filters.source,
      });
    }

    return queryBuilder;
  }
}

function normalizeAnalyticsFilters(
  filters: AnalyticsFilters,
): Required<AnalyticsFilters> {
  const days =
    Number.isFinite(filters.days) && filters.days && filters.days > 0
      ? Math.min(Math.round(filters.days), 365)
      : 30;

  return {
    days,
    source: filters.source?.trim() || 'all',
  };
}
