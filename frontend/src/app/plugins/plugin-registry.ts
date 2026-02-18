/**
 * Plugin manifest and registry. Hub uses this for nav and routing.
 */
export interface PluginManifest {
  id: string;
  name: string;
  path: string;
  icon?: string;
  order?: number;
}

export const PLUGINS: PluginManifest[] = [
  { id: 'reader', name: 'Reader', path: 'reader', order: 1 },
  { id: 'runner', name: 'Runner', path: 'runner', order: 2 },
  { id: 'calendar', name: 'Calendar', path: 'calendar', order: 3 },
  { id: 'user-management', name: 'User management', path: 'user-management', order: 99 },
];
