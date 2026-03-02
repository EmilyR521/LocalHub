export const GARDENER_PLUGIN_ID = 'gardener';
export const PLANTS_KEY = 'plants';
export const TASKS_KEY = 'tasks';
export const ZONES_KEY = 'zones';
export const JOBS_KEY = 'jobs';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
