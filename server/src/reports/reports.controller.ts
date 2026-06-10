import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { RequirePermission } from '../common/decorators/require-permission.decorator'
import { ReportQueryDto, StaffPerformanceQueryDto } from './dto/report-query.dto'
import { ReportsService } from './reports.service'

@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  @RequirePermission('report.view')
  async revenue(@Query() query: ReportQueryDto) {
    const result = await this.reports.getRevenue(query)
    return { success: true, ...result }
  }

  @Get('members')
  @RequirePermission('report.view')
  async members(@Query() query: ReportQueryDto) {
    const result = await this.reports.getMembers(query)
    return { success: true, ...result }
  }

  @Get('renewals')
  @RequirePermission('report.view')
  async renewals(@Query() query: ReportQueryDto) {
    const result = await this.reports.getRenewals(query)
    return { success: true, ...result }
  }

  @Get('staff-performance')
  @RequirePermission('report.view')
  async staffPerformance(@Query() query: StaffPerformanceQueryDto) {
    const result = await this.reports.getStaffPerformance(query)
    return { success: true, ...result }
  }
}
