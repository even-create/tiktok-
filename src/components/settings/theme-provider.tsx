"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppSettingsPublic, ThemeMode } from "@/lib/app-settings";

type ThemeContextValue = {
  settings: AppSettingsPublic | null;
  isLoading: boolean;
  applyTheme: (theme: ThemeMode) => void;
  refreshSettings: () => Promise<AppSettingsPublic | null>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettingsPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as { settings?: AppSettingsPublic; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取设置失败");
      }

      if (payload.settings) {
        setSettings(payload.settings);
        applyThemeToDocument(payload.settings.theme);
      }

      return payload.settings ?? null;
    } catch {
      applyThemeToDocument("light");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSettings]);

  const applyTheme = useCallback((theme: ThemeMode) => {
    applyThemeToDocument(theme);
    setSettings((current) => (current ? { ...current, theme, darkMode: theme === "dark" } : current));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      applyTheme,
      refreshSettings,
    }),
    [settings, isLoading, applyTheme, refreshSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppSettings must be used within ThemeProvider");
  }
  return context;
}
