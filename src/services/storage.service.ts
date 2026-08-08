import { STORAGE_KEY_TRIPS, STORAGE_KEY_SETTINGS } from '../utils/constants';
import type { TripSummary } from './trip.service';
import type { AppSettings } from '../utils/constants';
import { DEFAULT_SETTINGS } from '../utils/constants';

/**
 * Servicio de almacenamiento persistente usando localStorage.
 */
export class StorageService {
  /** Guardar viaje */
  saveTrip(trip: TripSummary): void {
    const trips = this.getTrips();
    trips.unshift(trip);
    // Limitar a 100 viajes
    if (trips.length > 100) trips.pop();
    localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(trips));
  }

  /** Obtener todos los viajes */
  getTrips(): TripSummary[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TRIPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Eliminar un viaje por ID */
  deleteTrip(id: string): void {
    const trips = this.getTrips().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(trips));
  }

  /** Eliminar todos los viajes */
  clearTrips(): void {
    localStorage.removeItem(STORAGE_KEY_TRIPS);
  }

  /** Guardar configuración */
  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  /** Obtener configuración */
  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }
}
