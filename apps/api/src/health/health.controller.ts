import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Report whether the API process is running' })
  @ApiResponse({ status: 200 })
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Report PostgreSQL, Redis, and migration readiness' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 503 })
  async readiness() {
    const result = await this.healthService.readiness();
    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
