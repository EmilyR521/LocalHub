import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HabitsService } from './services/habits.service';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="page-header">
      <h1>Habits</h1>
      <p class="subtitle">Create habits and check them off each day.</p>
    </header>
    <router-outlet />
  `,
})
export class HabitsComponent implements OnInit {
  private habitsService = inject(HabitsService);

  ngOnInit(): void {
    this.habitsService.load();
  }
}
