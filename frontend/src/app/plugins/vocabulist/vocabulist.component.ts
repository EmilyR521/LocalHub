import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { NavigationBarComponent, type NavigationBarItem } from '../../shared/components/navigation-bar/navigation-bar.component';
import { VocabulistSettingsComponent } from './components/vocabulist-settings/vocabulist-settings.component';
import { VocabulistService } from './services/vocabulist.service';

@Component({
  selector: 'app-vocabulist',
  standalone: true,
  imports: [
    RouterOutlet,
    SettingsDrawerHostComponent,
    NavigationBarComponent,
    VocabulistSettingsComponent,
  ],
  template: `
    <app-settings-drawer-host
      title="Vocabulist"
      subtitle="Build and review your vocabulary. Import in settings (⚙️), add topic tags, practice with spaced repetition.">
      <ng-container main>
        <app-navigation-bar
          [items]="vocabulistNavItems"
          ariaLabel="Vocabulist views" />
        <router-outlet />
      </ng-container>
      <ng-container settings>
        <app-vocabulist-settings />
      </ng-container>
    </app-settings-drawer-host>
  `,
})
export class VocabulistComponent implements OnInit {
  readonly vocabulistNavItems: NavigationBarItem[] = [
    { label: 'Vocabulary', route: '/plugins/vocabulist', exact: true },
    { label: 'Practice', route: '/plugins/vocabulist/practice' },
    { label: 'Grammar', route: '/plugins/vocabulist/grammar' },
  ];

  private vocab = inject(VocabulistService);

  ngOnInit(): void {
    this.vocab.load();
  }
}
