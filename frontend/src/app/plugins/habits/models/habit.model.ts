/** Target: every day (7/7) or X days per week */
export type HabitTarget =
  | { type: 'every_day' }
  | { type: 'days_per_week'; days: number };

export interface Habit {
  id: string;
  name: string;
  /** Hex colour for the habit (dots, etc.) */
  color?: string;
  /** User-selected emoji icon for the habit */
  icon?: string;
  /** Optional target; if unset, no target is shown */
  target?: HabitTarget;
  /** Display order (lower first); used for drag-and-drop reordering */
  order?: number;
}

/** date in YYYY-MM-DD */
export type DateKey = string;
