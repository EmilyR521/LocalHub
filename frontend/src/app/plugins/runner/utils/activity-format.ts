/** Shared formatting for Strava activities (distance, duration). */

export function formatDistance(meters?: number): string {
  if (meters == null) return '—';
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
}

export function formatDuration(seconds?: number): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`;
}
