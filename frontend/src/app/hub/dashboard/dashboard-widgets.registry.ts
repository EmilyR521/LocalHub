import type { Type } from '@angular/core';
import { DashboardCurrentlyReadingWidgetComponent } from './widgets/dashboard-currently-reading-widget.component';
import { DashboardLastRunWidgetComponent } from './widgets/dashboard-last-run-widget.component';
import { DashboardNextRunWidgetComponent } from './widgets/dashboard-next-run-widget.component';

export interface DashboardWidgetDef {
  id: string;
  name: string;
  component: Type<unknown>;
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  {
    id: 'currently-reading',
    name: 'Currently reading',
    component: DashboardCurrentlyReadingWidgetComponent,
  },
  {
    id: 'next-run',
    name: 'Next run',
    component: DashboardNextRunWidgetComponent,
  },
  {
    id: 'last-run',
    name: 'Last run',
    component: DashboardLastRunWidgetComponent,
  },
];

export function getDashboardWidgetById(id: string): DashboardWidgetDef | undefined {
  return DASHBOARD_WIDGETS.find((w) => w.id === id);
}
