import { Component, computed, inject, signal } from '@angular/core';
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

  readonly draggedWidgetId = signal<string | null>(null);

  readonly selectedWidgets = computed(() =>
    this.userProfile
      .dashboardWidgetIds()
      .map((id) => getDashboardWidgetById(id))
      .filter((w): w is DashboardWidgetDef => w != null)
  );

  onDragStart(widget: DashboardWidgetDef, event: DragEvent): void {
    if (!event.dataTransfer) return;
    this.draggedWidgetId.set(widget.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', widget.id);
    event.dataTransfer.setData('application/x-dashboard-widget-id', widget.id);
  }

  onDragEnd(): void {
    this.draggedWidgetId.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(targetWidget: DashboardWidgetDef, event: DragEvent): void {
    event.preventDefault();
    const id =
      event.dataTransfer?.getData('application/x-dashboard-widget-id') ||
      event.dataTransfer?.getData('text/plain');
    if (!id || id === targetWidget.id) {
      this.draggedWidgetId.set(null);
      return;
    }
    const ids = this.userProfile.dashboardWidgetIds();
    const fromIdx = ids.indexOf(id);
    const toIdx = ids.indexOf(targetWidget.id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
      this.draggedWidgetId.set(null);
      return;
    }
    const reordered = [...ids];
    const [removed] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, removed);
    this.userProfile.updateProfile({ dashboardWidgetIds: reordered });
    this.draggedWidgetId.set(null);
  }
}
