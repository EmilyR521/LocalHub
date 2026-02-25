import { Component, OnInit, inject } from '@angular/core';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { HabitsService } from './services/habits.service';
import { TodayHabitsComponent } from './today-habits/today-habits.component';
import { AllHabitsComponent } from './all-habits/all-habits.component';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [
    SettingsDrawerHostComponent,
    AllHabitsComponent,
    TodayHabitsComponent,
  ],
  templateUrl: './habits.component.html',
})
export class HabitsComponent implements OnInit {

  private habitsService = inject(HabitsService);

  ngOnInit(): void {
    this.habitsService.load();
  }
}
