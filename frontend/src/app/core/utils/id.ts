/**
 * Shared ID generation for plugins and entities.
 * Single implementation to avoid drift and duplication.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
