/** Admin access code (通行码) used for the administrator login entry. */
export function getTrackerPassword() {
  return process.env.TRACKER_PASSWORD ?? "zhaoeven";
}
