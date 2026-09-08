import { useCallback, useEffect, useState } from "react";
import {
  applyThemePreference,
  readThemePreference,
  writeThemePreference,
  type ThemePreference,
} from "@/shared/lib/themePreference";

export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  const choose = useCallback((next: ThemePreference) => {
    setPreference(next);
    writeThemePreference(next);
    applyThemePreference(next);
  }, []);

  useEffect(() => {
    function onStorage() {
      const stored = readThemePreference();
      setPreference(stored);
      applyThemePreference(stored);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [preference, choose];
}
