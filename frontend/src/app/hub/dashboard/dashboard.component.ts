import { Component, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { SettingsDrawerHostComponent } from '../../shared/components/settings-drawer-host/settings-drawer-host.component';
import { DashboardSettingsComponent } from './dashboard-settings/dashboard-settings.component';
import { UserProfileService } from '../../core/services/user-profile.service';
import { getDashboardWidgetById, type DashboardWidgetDef } from './dashboard-widgets.registry';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgComponentOutlet,
    SettingsDrawerHostComponent,
    DashboardSettingsComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private userProfile = inject(UserProfileService);

  readonly selectedWidgets = computed(() =>
    this.userProfile
      .dashboardWidgetIds()
      .map((id) => getDashboardWidgetById(id))
      .filter((w): w is DashboardWidgetDef => w != null)
  );
}
