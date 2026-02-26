import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HabitsService, toDateKey } from '../../../../plugins/habits/services/habits.service';
import type { Habit } from '../../../../plugins/habits/models/habit.model';

@Component({
  selector: 'app-dashboard-today-habits-widget',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-today-habits-widget.component.html',
})
export class DashboardTodayHabitsWidgetComponent implements OnInit {
  private habitsService = inject(HabitsService);

  ngOnInit(): void {
    this.habitsService.load();
  }

  private readonly todayKey = toDateKey(new Date());
  readonly habits = this.habitsService.habits;

  isCompleted(habitId: string): boolean {
    return this.habitsService.isCompleted(this.todayKey, habitId);
  }

  toggle(habit: Habit): void {
    this.habitsService.toggleCompletion(this.todayKey, habit.id);
  }
}
