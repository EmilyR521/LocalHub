import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterModule, RouterOutlet } from '@angular/router';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import { RunnerSettingsComponent } from './components/runner-settings/runner-settings.component';
import { StravaService } from './services/strava.service';

@Component({
  selector: 'app-runner',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    SettingsDrawerHostComponent,
    NavigationBarComponent,
    RunnerSettingsComponent,
  ],
  templateUrl: './runner.component.html',
})
export class RunnerComponent implements OnInit {
  readonly runnerNavItems: NavigationBarItem[] = [
    { label: 'Your plan', route: 'plan' },
    { label: 'Recent runs', route: 'recent', exact: true },
    { label: 'Stats', route: 'trends' },
    { label: 'Plan Generator', route: 'plan-generator' },
  ];

  private route = inject(ActivatedRoute);
  private strava = inject(StravaService);

  ngOnInit(): void {
    this.strava.checkConnection().subscribe();
    this.route.queryParams.subscribe((params) => {
      if (params['strava'] === 'connected') this.strava.refreshConnection();
    });
  }
}
