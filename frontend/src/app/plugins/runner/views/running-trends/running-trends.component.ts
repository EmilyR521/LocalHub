import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { StravaService, type StravaActivity } from '../../services/strava.service';

/** Monday of the week for the given ISO date string (YYYY-MM-DD or full ISO). */
function getWeekMonday(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function isRun(a: StravaActivity): boolean {
  const t = (a.type ?? '').toLowerCase();
  const s = (a.sport_type ?? '').toLowerCase();
  return t === 'run' || s === 'run';
}

export interface WeekPoint {
  weekStart: string;
  weekLabel: string;
  totalKm: number;
}

@Component({
  selector: 'app-running-trends',
  standalone: true,
  templateUrl: './running-trends.component.html',
})
export class RunningTrendsComponent implements OnInit {
  private strava = inject(StravaService);

  readonly connected = this.strava.connected.asReadonly();
  readonly loading = this.strava.loading.asReadonly();
  readonly activities = this.strava.activities.asReadonly();

  /** Weekly distance totals, oldest week first. */
  readonly weeklyData = computed<WeekPoint[]>(() => {
    const list = this.activities().filter(isRun);
    const byWeek = new Map<string, number>();
    for (const a of list) {
      const iso = a.start_date_local ?? a.start_date;
      if (!iso || a.distance == null) continue;
      const week = getWeekMonday(iso);
      const km = a.distance / 1000;
      byWeek.set(week, (byWeek.get(week) ?? 0) + km);
    }
    const weeks = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (weeks.length === 0) return [];
    return weeks.map(([weekStart, totalKm]) => {
      const d = new Date(weekStart + 'T12:00:00');
      const weekLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return { weekStart, weekLabel, totalKm };
    });
  });

  /** Chart dimensions and bar geometry for SVG (weekly distance bars). */
  readonly chartConfig = computed(() => {
    const data = this.weeklyData();
    if (data.length === 0) return null;
    const maxKm = Math.max(...data.map((d) => d.totalKm), 1);
    const padding = { top: 20, right: 20, bottom: 36, left: 44 };
    const width = 320;
    const height = 200;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barGap = 2;
    const totalGap = (data.length - 1) * barGap;
    const barWidth = (innerWidth - totalGap) / data.length;
    const bottomY = padding.top + innerHeight;
    const bars = data.map((d, i) => {
      const x = padding.left + i * (barWidth + barGap);
      const barHeight = maxKm > 0 ? (d.totalKm / maxKm) * innerHeight : 0;
      const y = bottomY - barHeight;
      return { x, y, width: barWidth, height: barHeight, totalKm: d.totalKm, weekLabel: d.weekLabel };
    });
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: padding.top + innerHeight - t * innerHeight,
      value: (t * maxKm).toFixed(t >= 0.5 ? 0 : 1),
    }));
    const xLabels = data
      .map((d, i) => ({
        weekLabel: d.weekLabel,
        x: padding.left + i * (barWidth + barGap) + barWidth / 2,
        show: i === 0 || i === data.length - 1 || data.length <= 6 || i % Math.ceil(data.length / 5) === 0,
      }))
      .filter((l) => l.show);
    const totalKm = data.reduce((sum, d) => sum + d.totalKm, 0);
    return {
      data,
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      maxKm,
      bars,
      yTicks,
      xLabels,
      axisLabelY: padding.top + innerHeight / 2,
      totalKm,
    };
  });

  ngOnInit(): void {
    this.strava.checkConnection().subscribe((r) => {
      if (r.connected) this.strava.loadActivities(1, 200).subscribe();
    });
  }

  loadMore(): void {
    this.strava.loadActivities(1, 200).subscribe();
  }
}
