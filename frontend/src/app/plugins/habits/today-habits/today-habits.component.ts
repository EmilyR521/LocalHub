import { Component, inject, computed } from '@angular/core';
import { HabitsService, toDateKey } from '../services/habits.service';
import type { Habit } from '../models/habit.model';

@Component({
  selector: 'app-today-habits',
  standalone: true,
  templateUrl: './today-habits.component.html',
})
export class TodayHabitsComponent {
  private habitsService = inject(HabitsService);

  private readonly todayKey = toDateKey(new Date());
  readonly habits = this.habitsService.habits;
  
  isCompleted(habitId: string): boolean {
    return this.habitsService.isCompleted(this.todayKey, habitId);
  }

  toggle(habit: Habit): void {
    this.habitsService.toggleCompletion(this.todayKey, habit.id);
  }
}
