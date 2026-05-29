"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDefaultPublicSettings, type AppSettingsPublic, type ThemeMode } from "@/lib/app-settings";

type ThemeContextValue = {
  settings: AppSettingsPublic | null;
  isLoading: boolean;
  loadError: string | null;
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    setLoadError(null);

    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as { settings?: AppSettingsPublic; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "读取设置失败");
      }

      const nextSettings = payload.settings ?? getDefaultPublicSettings();
      setSettings(nextSettings);
      applyThemeToDocument(nextSettings.theme);
      return nextSettings;
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取设置失败";
      setLoadError(message);
      const fallback = getDefaultPublicSettings();
      setSettings(fallback);
      applyThemeToDocument(fallback.theme);
      return fallback;
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
      loadError,
      applyTheme,
      refreshSettings,
    }),
    [settings, isLoading, loadError, applyTheme, refreshSettings],
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
