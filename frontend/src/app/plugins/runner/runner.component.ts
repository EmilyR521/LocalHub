import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { RunnerSettingsComponent } from './components/runner-settings/runner-settings.component';
import { StravaService } from './services/strava.service';

@Component({
  selector: 'app-runner',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    SettingsDrawerHostComponent,
    RunnerSettingsComponent,
  ],
  templateUrl: './runner.component.html',
})
export class RunnerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private strava = inject(StravaService);

  ngOnInit(): void {
    this.strava.checkConnection().subscribe();
    this.route.queryParams.subscribe((params) => {
      if (params['strava'] === 'connected') this.strava.refreshConnection();
    });
  }
}
