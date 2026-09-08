export type ThemePreference = "light" | "dark" | "system";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export const STORAGE_KEY = "theme_preference";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as string[]).includes(value);
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === DEFAULT_THEME_PREFERENCE) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
      // Storage can be unavailable or full; a stored preference is not worth failing a render over.
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
}
