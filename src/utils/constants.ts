/** Configuración por defecto de la app */
export const DEFAULT_SETTINGS = {
  /** Unidad de velocidad: 'kmh' | 'mph' */
  unit: 'kmh' as 'kmh' | 'mph',
  /** Límite de velocidad para alertas (en km/h) */
  speedLimit: 120,
  /** Alertas de velocidad habilitadas */
  speedAlertEnabled: true,
  /** Sonido de alerta habilitado */
  soundEnabled: true,
  /** Mantener pantalla encendida */
  wakeLockEnabled: true,
  /** Modo nocturno automático */
  nightMode: 'auto' as 'auto' | 'on' | 'off',
  /** Idioma de la interfaz */
  language: 'es' as 'es' | 'en',
  /** Estilo de distribución del Tablero */
  dashboardLayout: 'sport' as 'sport' | 'minimalist' | 'touring',
  /** Número de cilindros del motor para cálculo de RPM */
  engineCylinders: 1 as 1 | 2 | 3 | 4,
  /** Límite / Escala máxima de RPM para la gráfica */
  maxRpm: 12000 as 8000 | 10000 | 12000 | 14000 | 16000,
};

export type AppSettings = typeof DEFAULT_SETTINGS;

/** Factor de conversión m/s → km/h */
export const MS_TO_KMH = 3.6;

/** Factor de conversión km/h → mph */
export const KMH_TO_MPH = 0.621371;

/** Velocidad máxima del gauge (km/h) */
export const MAX_GAUGE_SPEED = 220;

/** Intervalo mínimo entre updates GPS (ms) */
export const GPS_MIN_INTERVAL = 500;

/** Umbral mínimo de velocidad para considerar movimiento (km/h) */
export const MIN_SPEED_THRESHOLD = 2;

/** Direcciones cardinales */
export const CARDINAL_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO',
  'O', 'ONO', 'NO', 'NNO',
] as const;

/** Clave de localStorage para viajes */
export const STORAGE_KEY_TRIPS = 'motospeed_trips';

/** Clave de localStorage para settings */
export const STORAGE_KEY_SETTINGS = 'motospeed_settings';

/** Tabs de navegación */
export const NAV_TABS = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>' },
  { id: 'trip', labelKey: 'nav.trip', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>' },
  { id: 'history', labelKey: 'nav.history', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' },
  { id: 'settings', labelKey: 'nav.settings', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
] as const;

export type TabId = typeof NAV_TABS[number]['id'];
