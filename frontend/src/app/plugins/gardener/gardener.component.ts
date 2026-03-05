import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { GardenerService } from './services/gardener.service';
import { GardenerSettingsComponent } from './components/gardener-settings/gardener-settings.component';

@Component({
  selector: 'app-gardener',
  standalone: true,
  imports: [
    RouterOutlet,
    NavigationBarComponent,
    SettingsDrawerHostComponent,
    GardenerSettingsComponent,
  ],
  template: `
    <app-settings-drawer-host title="Gardener" subtitle="Track your plants and garden.">
      <ng-container main>
        <app-navigation-bar
          [items]="gardenerNavItems"
          ariaLabel="Gardener views" />
        <router-outlet />
      </ng-container>
      <ng-container settings>
        <app-gardener-settings />
      </ng-container>
    </app-settings-drawer-host>
  `,
})
export class GardenerComponent implements OnInit {
  readonly gardenerNavItems: NavigationBarItem[] = [
    { label: 'Plants List', route: '/plugins/gardener', exact: true },
    { label: 'Zones', route: '/plugins/gardener/zones' },
    { label: 'Schedule', route: '/plugins/gardener/schedule' },
    { label: 'Jobs', route: '/plugins/gardener/jobs' },
  ];

  private gardenerService = inject(GardenerService);

  ngOnInit(): void {
    this.gardenerService.load();
  }
}
