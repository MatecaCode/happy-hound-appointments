// Frontend-only onboarding completion flag helpers

export const ONBOARD_KEY = (uid: string) => `vt_onboarding_done_${uid}`;

export function hasRunOnboarding(uid?: string | null): boolean {
  if (!uid) return false;
  try {
    return localStorage.getItem(ONBOARD_KEY(uid)) === '1';
  } catch {
    return false;
  }
}

export function setOnboardingDone(uid?: string | null): void {
  if (!uid) return;
  try {
    localStorage.setItem(ONBOARD_KEY(uid), '1');
  } catch {
    // ignore storage errors
  }
}


