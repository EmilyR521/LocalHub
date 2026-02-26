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

/** First day of month for the given date (YYYY-MM-DD). */
function getMonthStart(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Last N calendar months (month start date and short label), oldest first. */
function getMonthsForPeriod(monthCount: number): { monthStart: string; label: string }[] {
  const now = new Date();
  const result: { monthStart: string; label: string }[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      monthStart: getMonthStart(d),
      label: d.toLocaleDateString(undefined, { month: 'short' }),
    });
  }
  return result;
}

/** All week-start (Monday) dates in [rangeStart, rangeEnd), oldest first. */
function getWeekMondaysInRange(rangeStart: string, rangeEnd: string): string[] {
  const mondays: string[] = [];
  let monday = getWeekMonday(rangeStart);
  let d = new Date(monday + 'T12:00:00');
  if (monday < rangeStart) d.setDate(d.getDate() + 7);
  while (d.toISOString().slice(0, 10) < rangeEnd) {
    mondays.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
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

export interface WeekPacePoint {
  weekStart: string;
  weekLabel: string;
  /** Mean pace in min/km, or null if no runs that week. */
  avgPaceMinPerKm: number | null;
}

/** Pace in min/km from distance (m) and moving_time (s). Returns null if invalid. */
function paceMinPerKm(distanceM: number, movingTimeS: number): number | null {
  if (!distanceM || distanceM <= 0 || movingTimeS == null || movingTimeS < 0) return null;
  return (movingTimeS / 60) / (distanceM / 1000);
}

@Component({
  selector: 'app-running-trends',
  standalone: true,
  templateUrl: './running-trends.component.html',
})
export class RunningTrendsComponent implements OnInit {
  private strava = inject(StravaService);

  /** Selected chart period in months (3, 6, or 12). */
  readonly chartPeriodMonths = signal(3);

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
      const weekLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return { weekStart, weekLabel, totalKm };
    });
  });

  /** Weekly average pace (mean of each run's pace in that week). Map weekStart -> avgPaceMinPerKm. */
  private readonly weeklyPaceByWeek = computed<Map<string, number>>(() => {
    const list = this.activities().filter(isRun);
    const byWeek = new Map<string, number[]>();
    for (const a of list) {
      const iso = a.start_date_local ?? a.start_date;
      const dist = a.distance;
      const time = a.moving_time ?? a.elapsed_time;
      if (!iso || dist == null || time == null) continue;
      const pace = paceMinPerKm(dist, time);
      if (pace == null) continue;
      const week = getWeekMonday(iso);
      const arr = byWeek.get(week) ?? [];
      arr.push(pace);
      byWeek.set(week, arr);
    }
    const result = new Map<string, number>();
    for (const [week, paces] of byWeek) {
      if (paces.length > 0) {
        result.set(week, paces.reduce((s, p) => s + p, 0) / paces.length);
      }
    }
    return result;
  });

  /** Chart dimensions and bar geometry for SVG (one bar per week; 0 if no runs). */
  readonly chartConfig = computed(() => {
    const allData = this.weeklyData();
    const periodMonths = this.chartPeriodMonths();
    const months = getMonthsForPeriod(periodMonths);
    const rangeStart = months[0].monthStart;
    const rangeEndDate = new Date(months[months.length - 1].monthStart + 'T12:00:00');
    rangeEndDate.setMonth(rangeEndDate.getMonth() + 1);
    const rangeEnd = getMonthStart(rangeEndDate); // first day of month after current
    const kmByWeek = new Map(allData.map((d) => [d.weekStart, d.totalKm]));
    const weekStarts = getWeekMondaysInRange(rangeStart, rangeEnd);
    const data: WeekPoint[] = weekStarts.map((weekStart) => {
      const d = new Date(weekStart + 'T12:00:00');
      const weekLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const totalKm = kmByWeek.get(weekStart) ?? 0;
      return { weekStart, weekLabel, totalKm };
    });
    if (data.length === 0) return null;
    const maxKm = Math.max(...data.map((d) => d.totalKm), 1);
    const yScaleMaxKm = Math.ceil(maxKm / 10) * 10 || 10;
    const padding = { top: 32, right: 20, bottom: 64, left: 44 };
    const width = 320;
    const height = 232;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barGap = 4;
    const totalGap = (data.length - 1) * barGap;
    const barWidth = Math.max(1, (innerWidth - totalGap) / data.length);
    const bottomY = padding.top + innerHeight;
    const bars = data.map((d, i) => {
      const x = padding.left + i * (barWidth + barGap);
      const barHeight = yScaleMaxKm > 0 ? (d.totalKm / yScaleMaxKm) * innerHeight : 0;
      const y = bottomY - barHeight;
      return { x, y, width: barWidth, height: barHeight, totalKm: d.totalKm, weekLabel: d.weekLabel };
    });
    const yTicks = Array.from({ length: yScaleMaxKm / 10 + 1 }, (_, i) => i * 10).map((value) => ({
      y: padding.top + innerHeight - (value / yScaleMaxKm) * innerHeight,
      value: String(value),
    }));
    const monthCount = months.length;
    const xMonthTicks = months.map((m, i) => ({
      label: m.label,
      x: padding.left + (i / monthCount) * innerWidth,
      xLabel: padding.left + ((i + 0.5) / monthCount) * innerWidth,
    }));
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
      xMonthTicks,
      axisLabelY: padding.top + innerHeight / 2,
      totalKm,
      chartTitle: 'Weekly cumulative distance',
    };
  });

  /** Average pace chart config (line chart; same period and x-axis as distance chart). Y-axis from just below min to just above max. */
  readonly paceChartConfig = computed(() => {
    const periodMonths = this.chartPeriodMonths();
    const months = getMonthsForPeriod(periodMonths);
    const rangeStart = months[0].monthStart;
    const rangeEndDate = new Date(months[months.length - 1].monthStart + 'T12:00:00');
    rangeEndDate.setMonth(rangeEndDate.getMonth() + 1);
    const rangeEnd = getMonthStart(rangeEndDate);
    const paceByWeek = this.weeklyPaceByWeek();
    const weekStarts = getWeekMondaysInRange(rangeStart, rangeEnd);
    const data: WeekPacePoint[] = weekStarts.map((weekStart) => {
      const d = new Date(weekStart + 'T12:00:00');
      const weekLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const avgPaceMinPerKm = paceByWeek.get(weekStart) ?? null;
      return { weekStart, weekLabel, avgPaceMinPerKm };
    });
    const paces = data.map((d) => d.avgPaceMinPerKm).filter((p): p is number => p != null);
    const padding = { top: 32, right: 20, bottom: 64, left: 44 };
    const width = 320;
    const height = 232;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const barGap = 4;
    const totalGap = (data.length - 1) * barGap;
    const barWidth = Math.max(1, (innerWidth - totalGap) / data.length);
    const bottomY = padding.top + innerHeight;

    const yScaleMinPace = paces.length > 0 ? Math.floor(Math.min(...paces) * 2) / 2 - 0.5 : 4;
    const yScaleMaxPace = paces.length > 0 ? Math.ceil(Math.max(...paces) * 2) / 2 + 0.5 : 8;
    const yRange = Math.max(yScaleMaxPace - yScaleMinPace, 1);
    const paceToY = (pace: number) =>
      bottomY - ((pace - yScaleMinPace) / yRange) * innerHeight;

    const indexPacePairs: [number, number][] = data
      .map((d, i) => (d.avgPaceMinPerKm != null ? ([i, d.avgPaceMinPerKm] as [number, number]) : null))
      .filter((p): p is [number, number] => p != null);
    let trendPathD = '';
    if (indexPacePairs.length >= 2) {
      const n = indexPacePairs.length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;
      for (const [xi, yi] of indexPacePairs) {
        sumX += xi;
        sumY += yi;
        sumXY += xi * yi;
        sumXX += xi * xi;
      }
      const denom = n * sumXX - sumX * sumX;
      const m = Math.abs(denom) < 1e-10 ? 0 : (n * sumXY - sumX * sumY) / denom;
      const b = sumY / n - m * (sumX / n);
      const trendParts: string[] = [];
      for (let i = 0; i < data.length; i++) {
        const x = padding.left + i * (barWidth + barGap) + barWidth / 2;
        const trendPace = m * i + b;
        const y = paceToY(trendPace);
        trendParts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
      }
      trendPathD = trendParts.join(' ');
    }

    const linePoints = data
      .map((d, i) => ({
        x: padding.left + i * (barWidth + barGap) + barWidth / 2,
        y: d.avgPaceMinPerKm != null ? paceToY(d.avgPaceMinPerKm) : null,
        avgPaceMinPerKm: d.avgPaceMinPerKm,
        weekLabel: d.weekLabel,
      }))
      .filter((p) => p.avgPaceMinPerKm != null && p.y != null) as {
      x: number;
      y: number;
      avgPaceMinPerKm: number;
      weekLabel: string;
    }[];

    const yTickStep = yRange <= 2 ? 0.5 : 1;
    const yTicks: { y: number; value: string }[] = [];
    for (let v = yScaleMinPace; v <= yScaleMaxPace + 0.01; v += yTickStep) {
      yTicks.push({
        y: paceToY(v),
        value: String(v),
      });
    }

    const monthCount = months.length;
    const xMonthTicks = months.map((m, i) => ({
      label: m.label,
      x: padding.left + (i / monthCount) * innerWidth,
      xLabel: padding.left + ((i + 0.5) / monthCount) * innerWidth,
    }));
    return {
      data,
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      yScaleMinPace,
      yScaleMaxPace,
      trendPathD,
      linePoints,
      yTicks,
      xMonthTicks,
      axisLabelY: padding.top + innerHeight / 2,
      chartTitle: 'Average Pace',
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
