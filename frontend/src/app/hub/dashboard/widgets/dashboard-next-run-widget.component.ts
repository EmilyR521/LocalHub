import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RunnerPlanService } from '../../../plugins/runner/services/runner-plan.service';
import type { ScheduledRun } from '../../../plugins/runner/models/runner-plan.model';

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    const today = todayYMD();
    const run = schedule.find((r: ScheduledRun) => r.date >= today);
    return run ?? null;
  });

  ngOnInit(): void {
    this.runnerPlan.load();
  }
}
