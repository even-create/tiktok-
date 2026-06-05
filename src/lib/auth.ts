export const AUTH_COOKIE = "tracker_auth";

export function getTrackerPassword() {
  return process.env.TRACKER_PASSWORD ?? "zhaoeven";
}

export function getSessionToken() {
  return process.env.TRACKER_SESSION_TOKEN ?? "tiktok-tracker-session-zhaoeven";
}

export function isValidAuthToken(token: string | undefined) {
  if (!token) return false;
  return token === getSessionToken();
}
