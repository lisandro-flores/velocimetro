import { KMH_TO_MPH, CARDINAL_DIRECTIONS } from './constants';

/**
 * Formatea velocidad según la unidad seleccionada
 */
export function formatSpeed(kmh: number, unit: 'kmh' | 'mph' = 'kmh'): string {
  const value = unit === 'mph' ? kmh * KMH_TO_MPH : kmh;
  return Math.round(value).toString();
}

/**
 * Retorna la etiqueta de unidad
 */
export function getSpeedUnitLabel(unit: 'kmh' | 'mph'): string {
  return unit === 'kmh' ? 'km/h' : 'mph';
}

/**
 * Formatea distancia en km o mi
 */
export function formatDistance(km: number, unit: 'kmh' | 'mph' = 'kmh'): string {
  if (unit === 'mph') {
    const mi = km * KMH_TO_MPH;
    return mi < 1 ? `${(mi * 5280).toFixed(0)} ft` : `${mi.toFixed(2)} mi`;
  }
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`;
}

/**
 * Formatea tiempo en HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0'),
  ].join(':');
}

/**
 * Formatea altitud en metros
 */
export function formatAltitude(meters: number | null): string {
  if (meters === null || meters === undefined) return '--';
  return `${Math.round(meters)} m`;
}

/**
 * Convierte heading en grados a dirección cardinal
 */
export function headingToCardinal(heading: number): string {
  const index = Math.round(heading / 22.5) % 16;
  return CARDINAL_DIRECTIONS[index];
}

/**
 * Formatea fecha para display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea la hora actual HH:MM
 */
export function formatClock(): string {
  const now = new Date();
  return now.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Calcula distancia entre dos coordenadas usando fórmula Haversine (retorna km)
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
