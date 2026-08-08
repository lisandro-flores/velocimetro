import type { AppSettings } from './constants';
import { DEFAULT_SETTINGS } from './constants';

export function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function sanitizeAppSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const defaults = { ...DEFAULT_SETTINGS };
  const merged = { ...defaults, ...(input ?? {}) } as AppSettings;

  return {
    ...merged,
    unit: merged.unit === 'mph' ? 'mph' : 'kmh',
    speedLimit: clampNumber(merged.speedLimit, 20, 300, defaults.speedLimit),
    speedAlertEnabled: typeof merged.speedAlertEnabled === 'boolean' ? merged.speedAlertEnabled : defaults.speedAlertEnabled,
    soundEnabled: typeof merged.soundEnabled === 'boolean' ? merged.soundEnabled : defaults.soundEnabled,
    wakeLockEnabled: typeof merged.wakeLockEnabled === 'boolean' ? merged.wakeLockEnabled : defaults.wakeLockEnabled,
    nightMode: merged.nightMode === 'on' || merged.nightMode === 'off' ? merged.nightMode : 'auto',
    language: merged.language === 'en' ? 'en' : 'es',
    dashboardLayout: merged.dashboardLayout === 'minimalist' || merged.dashboardLayout === 'touring' ? merged.dashboardLayout : 'sport',
    engineCylinders: [1, 2, 3, 4].includes(merged.engineCylinders as number)
      ? (merged.engineCylinders as 1 | 2 | 3 | 4)
      : defaults.engineCylinders,
  };
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
