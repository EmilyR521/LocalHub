import type { Type } from '@angular/core';
import { DashboardCurrentlyReadingWidgetComponent } from './widgets/dashboard-currently-reading-widget.component';
import { DashboardLastRunWidgetComponent } from './widgets/dashboard-last-run-widget.component';
import { DashboardNextRunWidgetComponent } from './widgets/dashboard-next-run-widget.component';

export interface DashboardWidgetDef {
  id: string;
  name: string;
  component: Type<unknown>;
  /** Plugin that provides this widget's data (for source emoji in header). */
  pluginId: string;
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  {
    id: 'currently-reading',
    name: 'Currently reading',
    component: DashboardCurrentlyReadingWidgetComponent,
    pluginId: 'reader',
  },
  {
    id: 'next-run',
    name: 'Next run',
    component: DashboardNextRunWidgetComponent,
    pluginId: 'runner',
  },
  {
    id: 'last-run',
    name: 'Last run',
    component: DashboardLastRunWidgetComponent,
    pluginId: 'runner',
  },
];

export function getDashboardWidgetById(id: string): DashboardWidgetDef | undefined {
  return DASHBOARD_WIDGETS.find((w) => w.id === id);
}
