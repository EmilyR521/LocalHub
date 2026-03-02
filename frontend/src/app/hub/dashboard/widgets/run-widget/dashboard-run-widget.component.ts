import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatMonDayMonth, daysAgoLabel as formatDaysAgo, inDaysLabel, todayYMD } from '../../../../core/utils/date-format';
import { StravaService, type StravaActivity } from '../../../../plugins/runner/services/strava.service';
import { formatDistance as formatDist, formatDuration as formatDur } from '../../../../plugins/runner/utils/activity-format';
import type { ScheduledRun } from '../../../../plugins/runner/models/runner-plan.model';
import { RunnerPlanService } from '../../../../plugins/runner/services/runner-plan.service';

@Component({
  selector: 'app-dashboard-run-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-run-widget.component.html',
})
export class DashboardRunWidgetComponent implements OnInit {
  private strava = inject(StravaService);
  private runnerPlan = inject(RunnerPlanService);

  readonly connected = this.strava.connected.asReadonly();
  readonly lastRun = computed(() => {
    const activities = this.strava.activities();
    return activities.length > 0 ? activities[0] : null;
  });
  readonly nextRun = computed(() => {
    const schedule = this.runnerPlan.schedule();
    const run = schedule.find((r: ScheduledRun) => r.date >= todayYMD());
    return run ?? null;
  });

  ngOnInit(): void {
    this.strava.checkConnection().subscribe((r) => {
      if (r.connected) this.strava.loadActivities(1, 5).subscribe();
    });
    this.runnerPlan.load();
  }

  formatLastRunDate(activity: StravaActivity): string {
    const iso = activity.start_date_local ?? activity.start_date;
    if (!iso) return '—';
    try {
      return formatMonDayMonth(new Date(iso));
    } catch {
      return iso;
    }
  }

  daysAgoLabel(activity: StravaActivity): string {
    const iso = activity.start_date_local ?? activity.start_date;
    if (!iso) return '';
    try {
      return formatDaysAgo(new Date(iso));
    } catch {
      return '';
    }
  }

  formatDistance(activity: StravaActivity): string {
    return formatDist(activity.distance);
  }

  formatDuration(activity: StravaActivity): string {
    return formatDur(activity.moving_time ?? activity.elapsed_time);
  }

  formatNextRunDate(ymd: string): string {
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
