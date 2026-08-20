/**
 * Cookie and local storage utilities for tracking first-time visitors
 */

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  if (match && match[2]) return decodeURIComponent(match[2]);
  return null;
}

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "; expires=" + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(name, value);
  } catch {
    // ignore localStorage errors in private browsing
  }
}

export function hasSeenOnboarding(): boolean {
  const cookieVal = getCookie("paralegal_onboarded");
  if (cookieVal === "true") return true;

  try {
    return localStorage.getItem("paralegal_onboarded") === "true";
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  setCookie("paralegal_onboarded", "true", 365);
}
