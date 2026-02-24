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
  { id: 'reader', name: 'Reader', path: 'reader', icon: '📖', order: 1 },
  { id: 'runner', name: 'Runner', path: 'runner', icon: '🏃', order: 2 },
  { id: 'calendar', name: 'Calendar', path: 'calendar', icon: '📅', order: 3 },
  { id: 'lists', name: 'Lists', path: 'lists', icon: '📋', order: 4 },
  { id: 'habits', name: 'Habits', path: 'habits', icon: '✔️', order: 5 },
  { id: 'vocabulist', name: 'Vocabulist', path: 'vocabulist', icon: '📚', order: 6 },
  { id: 'user-management', name: 'User management', path: 'user-management', icon: '👤', order: 99 },
];
