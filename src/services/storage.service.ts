import Dexie, { type Table } from 'dexie';
import { STORAGE_KEY_SETTINGS } from '../utils/constants';
import type { TripSummary } from './trip.service';
import type { AppSettings } from '../utils/constants';
import { DEFAULT_SETTINGS } from '../utils/constants';

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
    await db.trips.put(trip);
    // Limitar a 100 viajes
    const count = await db.trips.count();
    if (count > 100) {
      const oldest = await db.trips.orderBy('startTime').first();
      if (oldest) {
        await db.trips.delete(oldest.id);
      }
    }
  }

  /** Obtener todos los viajes */
  async getTrips(): Promise<TripSummary[]> {
    return await db.trips.orderBy('startTime').reverse().toArray();
  }

  /** Eliminar un viaje por ID */
  async deleteTrip(id: string): Promise<void> {
    await db.trips.delete(id);
  }

  /** Eliminar todos los viajes */
  async clearTrips(): Promise<void> {
    await db.trips.clear();
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
