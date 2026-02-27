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

/** Pace as min/km from distance (m) and moving time (s). Returns "X:XX /km" or "—" if invalid. */
export function formatPace(distanceM?: number, movingTimeS?: number): string {
  if (distanceM == null || distanceM <= 0 || movingTimeS == null || movingTimeS < 0) return '—';
  const paceMinPerKm = movingTimeS / 60 / (distanceM / 1000);
  const wholeMin = Math.floor(paceMinPerKm);
  const sec = Math.round((paceMinPerKm - wholeMin) * 60);
  const s = sec >= 60 ? 0 : sec;
  const m = sec >= 60 ? wholeMin + 1 : wholeMin;
  return `${m}:${String(s).padStart(2, '0')} /km`;
}
