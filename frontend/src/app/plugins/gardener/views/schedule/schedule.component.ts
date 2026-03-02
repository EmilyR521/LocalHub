import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GardenerService } from '../../services/gardener.service';
import type { GardeningTask } from '../../models/gardening-task.model';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): { date: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  const y = year;
  const m = String(month).padStart(2, '0');
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month - 1, 1 - (startPad - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dateStr = `${y}-${m}-${String(d).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month, i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ date: dateStr, day: d.getDate(), isCurrentMonth: false });
  }
  return days;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './schedule.component.html',
})
export class ScheduleComponent {
  readonly gardener = inject(GardenerService);

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth() + 1);
  readonly selectedDate = signal<string | null>(null);
  readonly panelOpen = signal(false);
  readonly editingTask = signal<GardeningTask | null>(null);

  formDate = '';
  formTitle = '';
  formNotes = '';

  readonly tasks = this.gardener.tasks;

  readonly monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed(() =>
    getDaysInMonth(this.viewYear(), this.viewMonth())
  );

  readonly tasksByDate = computed(() => {
    const map = new Map<string, GardeningTask[]>();
    for (const t of this.gardener.tasks()) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    for (const [, list] of map) list.sort((a, b) => a.title.localeCompare(b.title));
    return map;
  });

  readonly selectedDateTasks = computed(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.tasksByDate().get(date) ?? [];
  });

  readonly taskCountByDate = computed(() => {
    const map = new Map<string, number>();
    for (const t of this.gardener.tasks()) {
      map.set(t.date, (map.get(t.date) ?? 0) + 1);
    }
    return map;
  });

  readonly DAY_NAMES = DAY_NAMES;

  prevMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  nextMonth(): void {
    let y = this.viewYear();
    let m = this.viewMonth() + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
  }

  openAddTask(): void {
    const date = this.selectedDate() ?? new Date().toISOString().slice(0, 10);
    this.editingTask.set(null);
    this.formDate = date;
    this.formTitle = '';
    this.formNotes = '';
    this.panelOpen.set(true);
  }

  openEditTask(task: GardeningTask): void {
    this.editingTask.set(task);
    this.formDate = task.date;
    this.formTitle = task.title;
    this.formNotes = task.notes ?? '';
    this.panelOpen.set(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
    this.editingTask.set(null);
  }

  saveTask(): void {
    const title = this.formTitle.trim();
    if (!title || !this.formDate) return;
    const task = this.editingTask();
    if (task) {
      this.gardener.updateTask(task.id, {
        date: this.formDate,
        title,
        notes: this.formNotes.trim() || undefined,
      });
    } else {
      this.gardener.addTask({
        date: this.formDate,
        title,
        notes: this.formNotes.trim() || undefined,
      });
    }
    this.closePanel();
  }

  deleteTask(): void {
    const task = this.editingTask();
    if (task) {
      this.gardener.removeTask(task.id);
      this.closePanel();
    }
  }
}
