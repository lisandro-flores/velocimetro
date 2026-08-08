import Dexie, { type Table } from 'dexie';
import { STORAGE_KEY_SETTINGS } from '../utils/constants';
import type { TripSummary } from './trip.service';
import type { AppSettings } from '../utils/constants';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { safeParseJson, sanitizeAppSettings } from '../utils/validation';

class MotoSpeedDB extends Dexie {
  trips!: Table<TripSummary, string>;

  constructor() {
    super('MotoSpeedDB');
    this.version(1).stores({
      trips: 'id, startTime' // Primary key and indexed props
    });
  }
}

const db = new MotoSpeedDB();

/**
 * Servicio de almacenamiento persistente usando IndexedDB (trips) y localStorage (settings).
 */
export class StorageService {
  /** Guardar viaje */
  async saveTrip(trip: TripSummary): Promise<void> {
    try {
      await db.trips.put(trip);
      const count = await db.trips.count();
      if (count > 100) {
        const oldest = await db.trips.orderBy('startTime').first();
        if (oldest) {
          await db.trips.delete(oldest.id);
        }
      }
    } catch (error) {
      console.error('No se pudo guardar el viaje:', error);
      throw error;
    }
  }

  /** Obtener todos los viajes */
  async getTrips(): Promise<TripSummary[]> {
    try {
      return await db.trips.orderBy('startTime').reverse().toArray();
    } catch (error) {
      console.error('No se pudieron cargar los viajes:', error);
      return [];
    }
  }

  /** Eliminar un viaje por ID */
  async deleteTrip(id: string): Promise<void> {
    try {
      await db.trips.delete(id);
    } catch (error) {
      console.error('No se pudo eliminar el viaje:', error);
      throw error;
    }
  }

  /** Eliminar todos los viajes */
  async clearTrips(): Promise<void> {
    try {
      await db.trips.clear();
    } catch (error) {
      console.error('No se pudo limpiar el historial:', error);
      throw error;
    }
  }

  /** Guardar configuración */
  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(sanitizeAppSettings(settings)));
    } catch (error) {
      console.error('No se pudieron guardar los ajustes:', error);
    }
  }

  /** Obtener configuración */
  getSettings(): AppSettings {
    const raw = safeParseJson<AppSettings | null>(localStorage.getItem(STORAGE_KEY_SETTINGS), null);
    return sanitizeAppSettings(raw ?? { ...DEFAULT_SETTINGS });
  }
}
