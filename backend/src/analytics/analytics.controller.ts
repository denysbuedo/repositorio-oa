import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateUsageEventDto } from './dto/usage-event.dto';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @Public()
  recordEvent(@Body() dto: CreateUsageEventDto) {
    return this.analyticsService.recordEvent(dto);
  }

  @Get('summary')
  getSummary(@Query('days') days?: string, @Query('source') source?: string) {
    return this.analyticsService.getSummary({
      days: days ? Number(days) : undefined,
      source,
    });
  }
}
