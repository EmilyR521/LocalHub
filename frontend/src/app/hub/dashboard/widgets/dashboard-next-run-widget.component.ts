import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMonDayMonth, inDaysLabel, todayYMD } from '../../../core/utils/date-format';
import type { ScheduledRun } from '../../../plugins/runner/models/runner-plan.model';
import { RunnerPlanService } from '../../../plugins/runner/services/runner-plan.service';

@Component({
  selector: 'app-dashboard-next-run-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-next-run-widget.component.html',
})
export class DashboardNextRunWidgetComponent implements OnInit {
  private runnerPlan = inject(RunnerPlanService);

  readonly nextRun = computed(() => {
    const schedule = this.runnerPlan.schedule();
    const run = schedule.find((r: ScheduledRun) => r.date >= todayYMD());
    return run ?? null;
  });

  ngOnInit(): void {
    this.runnerPlan.load();
  }

  formatDate(ymd: string): string {
    try {
      return formatMonDayMonth(new Date(ymd + 'T00:00:00'));
    } catch {
      return ymd;
    }
  }

  inDays(ymd: string): string {
    return inDaysLabel(ymd);
  }
}
