import type { Type } from '@angular/core';
import { DashboardCalendarWidgetComponent } from './widgets/dashboard-calendar-widget.component';
import { DashboardCurrentlyReadingWidgetComponent } from './widgets/dashboard-currently-reading-widget.component';
import { DashboardLastRunWidgetComponent } from './widgets/dashboard-last-run-widget.component';
import { DashboardNextRunWidgetComponent } from './widgets/dashboard-next-run-widget.component';

export interface DashboardWidgetDef {
  id: string;
  name: string;
  component: Type<unknown>;
  /** Plugin that provides this widget's data (for source emoji in header). */
  pluginId: string;
  /** Number of columns to span (e.g. 3 = full width when dashboard has 3 columns). Omit for single column. */
  columns?: number;
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
  {
    id: 'calendar',
    name: 'Calendar',
    component: DashboardCalendarWidgetComponent,
    pluginId: 'calendar',
    columns: 3,
  },
];

export function getDashboardWidgetById(id: string): DashboardWidgetDef | undefined {
  return DASHBOARD_WIDGETS.find((w) => w.id === id);
}
