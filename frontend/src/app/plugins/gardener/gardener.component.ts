import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import { GardenerService } from './services/gardener.service';

@Component({
  selector: 'app-gardener',
  standalone: true,
  imports: [RouterOutlet, NavigationBarComponent],
  template: `
    <header class="page-header">
      <h1>Gardener</h1>
      <p class="subtitle">Track your plants and garden.</p>
    </header>
    <app-navigation-bar
      [items]="gardenerNavItems"
      ariaLabel="Gardener views" />
    <router-outlet />
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
