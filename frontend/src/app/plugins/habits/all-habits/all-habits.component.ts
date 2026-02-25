import { Component, inject, signal, computed } from '@angular/core';
import { HabitsService, toDateKey, DEFAULT_HABIT_COLORS } from '../services/habits.service';
import type { Habit, HabitTarget } from '../models/habit.model';
import { EmojiGridComponent } from '../../../shared/components/emoji-grid/emoji-grid.component';

export interface DotCell {
  key: string;
  date: Date | null;
}

/** One month in the year-so-far view: label and 7-column grid rows (null = empty cell). */
export interface YearMonthBlock {
  monthLabel: string;
  year: number;
  month: number; // 1-based
  rows: (Date | null)[][];
}

/**
 * Returns the last four weeks as a 4×7 grid (row = week, col = weekday Mon–Sun).
 * Top row = current week, only up to and including today (future days are null).
 * Rows 1–3 = previous three full weeks.
 */
function getFourWeeksGrid(): DotCell[][] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 = Mon, 6 = Sun
  const currentWeekMonday = new Date(today);
  currentWeekMonday.setDate(today.getDate() - mondayOffset);

  const grid: DotCell[][] = [];

  // Row 0: current week, only Mon..Today (no future days)
  const currentRow: DotCell[] = [];
  for (let i = 0; i <= mondayOffset; i++) {
    const d = new Date(currentWeekMonday);
    d.setDate(currentWeekMonday.getDate() + i);
    currentRow.push({ key: `0-${i}`, date: d });
  }
  for (let i = currentRow.length; i < 7; i++) {
    currentRow.push({ key: `0-${i}`, date: null });
  }
  grid.push(currentRow);

  // Rows 1–3: previous three full weeks
  for (let w = 1; w <= 3; w++) {
    const weekStart = new Date(currentWeekMonday);
    weekStart.setDate(currentWeekMonday.getDate() - w * 7);
    const row: DotCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      row.push({ key: `${w}-${i}`, date: d });
    }
    grid.push(row);
  }

  return grid;
}

/** Monday = 0 .. Sunday = 6 (matches grid columns). */
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDayLetter(d: Date): string {
  const dayIndex = (d.getDay() + 6) % 7;
  return DAY_LETTERS[dayIndex];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Month blocks for a given year: Jan–Dec (or Jan–current month if year is current year). */
function getYearMonthBlocks(year: number): YearMonthBlock[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth1Based = today.getMonth() + 1;
  const lastMonth = year === currentYear ? currentMonth1Based : 12;
  const blocks: YearMonthBlock[] = [];

  for (let month1 = 1; month1 <= lastMonth; month1++) {
    const month0 = month1 - 1;
    const first = new Date(year, month0, 1);
    const lastDayOfMonth = new Date(year, month1, 0).getDate();
    const firstWeekday = (first.getDay() + 6) % 7; // Mon=0
    const isCurrentMonth = year === currentYear && month1 === currentMonth1Based;
    const lastDay = isCurrentMonth ? Math.min(today.getDate(), lastDayOfMonth) : lastDayOfMonth;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= lastDay; day++) {
      cells.push(new Date(year, month0, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(cells.slice(r, r + 7));
    }

    blocks.push({
      monthLabel: MONTH_LABELS[month0],
      year,
      month: month1,
      rows,
    });
  }

  return blocks;
}

const DEFAULT_HABIT_ICON = '✓';

@Component({
  selector: 'app-all-habits',
  standalone: true,
  imports: [EmojiGridComponent],
  templateUrl: './all-habits.component.html',
})
export class AllHabitsComponent { 
  private habitsService = inject(HabitsService);

  /** 4×7 grid: row 0 = current week (up to today), rows 1–3 = previous weeks. null = future day (no dot). */
  readonly dotMatrixRows = computed(() => getFourWeeksGrid());
  /** Selected year in the habit detail view. */
  readonly selectedDetailYear = signal(new Date().getFullYear());
  /** Month blocks for the selected year in detail view. */
  readonly yearMonthBlocks = computed(() => getYearMonthBlocks(this.selectedDetailYear()));
  readonly habits = this.habitsService.habits;
  readonly newHabitName = signal('');
  readonly editingHabit = signal<Habit | null>(null);
  readonly configName = signal('');
  readonly configColor = signal('');
  readonly configIcon = signal(DEFAULT_HABIT_ICON);
  readonly configTarget = signal<HabitTarget | undefined>(undefined);

  readonly defaultColors = DEFAULT_HABIT_COLORS;
  readonly draggedHabitId = signal<string | null>(null);

  isCompleted(dateKey: string, habitId: string): boolean {
    return this.habitsService.isCompleted(dateKey, habitId);
  }

  toggleDot(habit: Habit, dateKey: string): void {
    this.habitsService.toggleCompletion(dateKey, habit.id);
  }

  openConfig(habit: Habit, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editingHabit.set(habit);
    this.selectedDetailYear.set(new Date().getFullYear());
    this.configName.set(habit.name);
    this.configColor.set(habit.color ?? DEFAULT_HABIT_COLORS[0]);
    this.configIcon.set(habit.icon?.trim() || DEFAULT_HABIT_ICON);
    this.configTarget.set(habit.target);
  }

  /** Years that have at least one completion for this habit, plus current year. Sorted descending. */
  yearsWithData(habit: Habit): number[] {
    const completions = this.habitsService.completions();
    const currentYear = new Date().getFullYear();
    const years = new Set<number>([currentYear]);
    for (const [dateKey, habitIds] of Object.entries(completions)) {
      if (habitIds.includes(habit.id) && dateKey.length >= 4) {
        const y = parseInt(dateKey.slice(0, 4), 10);
        if (!Number.isNaN(y)) years.add(y);
      }
    }
    return [...years].sort((a, b) => b - a);
  }

  closeConfig(): void {
    this.editingHabit.set(null);
  }

  saveConfig(): void {
    const habit = this.editingHabit();
    if (!habit) return;
    this.habitsService.updateHabit(habit.id, {
      name: this.configName(),
      color: this.configColor(),
      icon: this.configIcon().trim() || undefined,
      target: this.configTarget(),
    });
    this.closeConfig();
  }

  deleteHabit(habit: Habit, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (confirm(`Delete habit "${habit.name}"?`)) {
      this.habitsService.deleteHabit(habit.id);
      if (this.editingHabit()?.id === habit.id) this.closeConfig();
    }
  }

  addHabit(): void {
    const name = this.newHabitName().trim();
    if (name) {
      this.habitsService.addHabit(name);
      this.newHabitName.set('');
    }
  }

  weekDayLabel(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'narrow' });
  }

  /** Tooltip for a dot in the matrix (e.g. "Mon 17 Feb"). */
  formatDotTitle(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  dateKey(d: Date): string {
    return toDateKey(d);
  }

  /** Day-of-week letter for a date (M, T, W, T, F, S, S). */
  dayLetter(d: Date): string {
    return getDayLetter(d);
  }

  /**
   * Whether the habit's goal was met for the given matrix row (week).
   * Row 0 = current week (only days up to today), rows 1–3 = full previous weeks.
   */
  weekGoalMet(habit: Habit, rowIndex: number): boolean {
    const target = habit.target;
    if (!target) return false;
    const row = this.dotMatrixRows()[rowIndex];
    if (!row) return false;
    const dateKeys = row.filter((c): c is { key: string; date: Date } => c.date !== null).map((c) => toDateKey(c.date));
    const completedCount = dateKeys.filter((k) => this.isCompleted(k, habit.id)).length;
    const totalDays = dateKeys.length;
    if (target.type === 'every_day') return totalDays > 0 && completedCount === totalDays;
    if (target.type === 'days_per_week') return completedCount >= target.days;
    return false;
  }

  targetLabel(habit: Habit): string {
    const t = habit.target;
    if (!t) return '';
    if (t.type === 'every_day') return 'Every day';
    return `${t.days} days/week`;
  }

  streak(habitId: string): number {
    return this.habitsService.getStreak(habitId);
  }

  setConfigTargetEveryDay(): void {
    this.configTarget.set({ type: 'every_day' });
  }

  setConfigTargetDaysPerWeek(days: number | string): void {
    const n = typeof days === 'string' ? parseInt(days, 10) : days;
    this.configTarget.set({ type: 'days_per_week', days: Math.min(7, Math.max(1, Number.isNaN(n) ? 1 : n)) });
  }

  clearConfigTarget(): void {
    this.configTarget.set(undefined);
  }

  /** Days value for "days per week" target (for the number input). */
  configTargetDays(): number {
    const t = this.configTarget();
    return t?.type === 'days_per_week' ? t.days : 3;
  }

  onDragStart(habit: Habit, event: DragEvent): void {
    if (!event.dataTransfer) return;
    this.draggedHabitId.set(habit.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', habit.id);
    event.dataTransfer.setData('application/x-habit-id', habit.id);
  }

  onDragEnd(): void {
    this.draggedHabitId.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(targetHabit: Habit, event: DragEvent): void {
    event.preventDefault();
    const id = event.dataTransfer?.getData('application/x-habit-id') || event.dataTransfer?.getData('text/plain');
    if (!id || id === targetHabit.id) {
      this.draggedHabitId.set(null);
      return;
    }
    const list = this.habits();
    const fromIdx = list.findIndex((h) => h.id === id);
    const toIdx = list.findIndex((h) => h.id === targetHabit.id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
      this.draggedHabitId.set(null);
      return;
    }
    const reordered = [...list];
    const [removed] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, removed);
    this.habitsService.reorderHabits(reordered);
    this.draggedHabitId.set(null);
  }
}
