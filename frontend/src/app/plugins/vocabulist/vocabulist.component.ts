import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { VocabulistSettingsComponent } from './components/vocabulist-settings/vocabulist-settings.component';

@Component({
  selector: 'app-vocabulist',
  standalone: true,
  imports: [
    RouterOutlet,
    SettingsDrawerHostComponent,
    VocabulistSettingsComponent,
  ],
  template: `
    <app-settings-drawer-host
      title="Vocabulist"
      subtitle="Build and review your vocabulary. Import in settings (⚙️), add topic tags, practice with spaced repetition.">
      <ng-container main>
        <router-outlet />
      </ng-container>
      <ng-container settings>
        <app-vocabulist-settings />
      </ng-container>
    </app-settings-drawer-host>
  `,
})
export class VocabulistComponent {}
