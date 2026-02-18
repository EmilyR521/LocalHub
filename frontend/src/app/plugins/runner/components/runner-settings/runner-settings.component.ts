import { Component, inject } from '@angular/core';
import { StravaService } from '../../services/strava.service';

@Component({
  selector: 'app-runner-settings',
  standalone: true,
  templateUrl: './runner-settings.component.html',
})
export class RunnerSettingsComponent {
  readonly strava = inject(StravaService);
}
