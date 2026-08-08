export type LanguageCode = 'es' | 'en';

type Dictionary = Record<string, string>;

const es: Dictionary = {
  // Navigation
  'nav.speed': 'Velocidad',
  'nav.trip': 'Viaje',
  'nav.dashboard': 'Tablero',
  'nav.compass': 'Brújula',
  'nav.history': 'Historial',
  'nav.settings': 'Config',

  // Speedometer
  'speed.max': 'MAX',

  // Trip Panel
  'trip.title': 'Panel de Viaje',
  'trip.status.idle': 'Detenido',
  'trip.status.running': 'En marcha',
  'trip.status.paused': 'Pausado',
  'trip.distance': 'Distancia',
  'trip.time': 'Tiempo',
  'trip.avgSpeed': 'Vel. Promedio',
  'trip.maxSpeed': 'Vel. Máxima',
  'trip.altitude': 'Altitud',
  'trip.start': 'Iniciar Viaje',
  'trip.resume': 'Reanudar',
  'trip.pause': 'Pausar',
  'trip.reset': 'Reset',
  'trip.save': 'Guardar',

  // History
  'history.title': 'Historial de Viajes',
  'history.clear': 'Limpiar todo',
  'history.count': '{0} viaje(s)',
  'history.empty': 'No hay viajes registrados',
  'history.emptyHint': 'Iniciá un viaje desde el panel de viaje',
  'history.deleteConfirm': '¿Eliminar todos los viajes?',

  // Dashboard
  'dash.accel': 'ACCEL',
  'dash.brake': 'BRAKE',
  'dash.trip': 'TRIP',
  'dash.alt': 'ALT',
  'dash.lean': 'LEAN',
  'dash.start': 'ENTRAR MODO TABLERO',
  'dash.alignWarning': '⚠️ Alineación Incorrecta',
  'dash.calibrate': 'Calibrar Centro',

  // Settings
  'settings.title': 'Configuración',
  'settings.speed': 'Velocidad',
  'settings.unit.title': 'Unidad de velocidad',
  'settings.unit.desc': 'Kilómetros o millas por hora',
  'settings.limit.title': 'Límite de velocidad',
  'settings.limit.desc': 'Alerta al superar este valor',
  'settings.alerts': 'Alertas',
  'settings.alert.title': 'Alerta de velocidad',
  'settings.alert.desc': 'Vibración y aviso visual',
  'settings.sound.title': 'Sonido de alerta',
  'settings.sound.desc': 'Reproducir tono al superar límite',
  'settings.display': 'Pantalla',
  'settings.wakelock.title': 'Pantalla siempre encendida',
  'settings.wakelock.desc': 'Evitar que se apague la pantalla',
  'settings.fullscreen.title': 'Pantalla completa',
  'settings.fullscreen.desc': 'Ocultar barra del navegador',
  'settings.fullscreen.on': 'Desactivar',
  'settings.fullscreen.off': 'Activar',
  'settings.lang.title': 'Idioma',
  'settings.lang.desc': 'Idioma de la interfaz',
  'settings.theme.title': 'Tema Visual',
  'settings.theme.desc': 'Claro, Oscuro o Automático',
  'settings.theme.auto': 'Automático',
  'settings.theme.dark': 'Oscuro',
  'settings.theme.light': 'Claro',
  'settings.layout.title': 'Diseño del Tablero',
  'settings.layout.desc': 'Distribución visual en ruta',
  'settings.layout.sport': 'Deportivo',
  'settings.layout.minimalist': 'Minimalista',
  'settings.layout.touring': 'Turismo',
  'settings.install.title': 'Instalar Aplicación',
  'settings.install.desc': 'Instalar como app nativa',
  'settings.install.btn': 'Instalar App',
  'settings.desc': 'Velocímetro PWA para motociclismo',
};

const en: Dictionary = {
  // Navigation
  'nav.speed': 'Speed',
  'nav.trip': 'Trip',
  'nav.dashboard': 'Dashboard',
  'nav.compass': 'Compass',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  // Speedometer
  'speed.max': 'MAX',

  // Trip Panel
  'trip.title': 'Trip Panel',
  'trip.status.idle': 'Stopped',
  'trip.status.running': 'Running',
  'trip.status.paused': 'Paused',
  'trip.distance': 'Distance',
  'trip.time': 'Time',
  'trip.avgSpeed': 'Avg Speed',
  'trip.maxSpeed': 'Max Speed',
  'trip.altitude': 'Altitude',
  'trip.start': 'Start Trip',
  'trip.resume': 'Resume',
  'trip.pause': 'Pause',
  'trip.reset': 'Reset',
  'trip.save': 'Save',

  // History
  'history.title': 'Trip History',
  'history.clear': 'Clear all',
  'history.count': '{0} trip(s)',
  'history.empty': 'No trips recorded',
  'history.emptyHint': 'Start a trip from the trip panel',
  'history.deleteConfirm': 'Delete all trips?',

  // Dashboard
  'dash.accel': 'ACCEL',
  'dash.brake': 'BRAKE',
  'dash.trip': 'TRIP',
  'dash.alt': 'ALT',
  'dash.lean': 'LEAN',
  'dash.start': 'ENTER DASHBOARD MODE',
  'dash.alignWarning': '⚠️ Poor Alignment',
  'dash.calibrate': 'Calibrate Center',

  // Settings
  'settings.title': 'Settings',
  'settings.speed': 'Speed',
  'settings.unit.title': 'Speed Unit',
  'settings.unit.desc': 'Kilometers or miles per hour',
  'settings.limit.title': 'Speed Limit',
  'settings.limit.desc': 'Alert when exceeding this value',
  'settings.alerts': 'Alerts',
  'settings.alert.title': 'Speed Alert',
  'settings.alert.desc': 'Vibration and visual warning',
  'settings.sound.title': 'Alert Sound',
  'settings.sound.desc': 'Play sound when exceeding limit',
  'settings.display': 'Display',
  'settings.wakelock.title': 'Keep Screen On',
  'settings.wakelock.desc': 'Prevent screen from turning off',
  'settings.fullscreen.title': 'Fullscreen',
  'settings.fullscreen.desc': 'Hide browser UI',
  'settings.fullscreen.on': 'Disable',
  'settings.fullscreen.off': 'Enable',
  'settings.lang.title': 'Language',
  'settings.lang.desc': 'Interface language',
  'settings.theme.title': 'Visual Theme',
  'settings.theme.desc': 'Light, Dark, or Auto',
  'settings.theme.auto': 'Auto',
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.layout.title': 'Dashboard Layout',
  'settings.layout.desc': 'Visual distribution on route',
  'settings.layout.sport': 'Sport',
  'settings.layout.minimalist': 'Minimalist',
  'settings.layout.touring': 'Touring',
  'settings.install.title': 'Install App',
  'settings.install.desc': 'Install as native app',
  'settings.install.btn': 'Install App',
  'settings.desc': 'Motorcycle PWA Speedometer',
};

const dictionaries: Record<LanguageCode, Dictionary> = { es, en };

let currentLang: LanguageCode = 'es';

export function setLanguage(lang: LanguageCode): void {
  currentLang = lang;
}

export function getLanguage(): LanguageCode {
  return currentLang;
}

export function t(key: string, ...args: string[]): string {
  const dict = dictionaries[currentLang];
  let text = dict[key] || key;
  
  // Replace {0}, {1}, etc.
  args.forEach((arg, i) => {
    text = text.replace(`{${i}}`, arg);
  });
  
  return text;
}
