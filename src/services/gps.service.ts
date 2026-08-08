import { MS_TO_KMH, GPS_MIN_INTERVAL } from '../utils/constants';

/** Datos emitidos por el servicio GPS */
export interface GpsData {
  /** Velocidad en km/h */
  speed: number;
  /** Latitud */
  latitude: number;
  /** Longitud */
  longitude: number;
  /** Altitud en metros (puede ser null) */
  altitude: number | null;
  /** Heading/rumbo en grados (puede ser null) */
  heading: number | null;
  /** Precisión en metros */
  accuracy: number;
  /** Timestamp del GPS */
  timestamp: number;
}

export type GpsCallback = (data: GpsData) => void;
export type GpsErrorCallback = (error: GeolocationPositionError) => void;

/**
 * Servicio GPS que envuelve la Geolocation API del navegador.
 * Emite datos de posición, velocidad y rumbo en tiempo real.
 */
export class GpsService {
  private watchId: number | null = null;
  private listeners: GpsCallback[] = [];
  private errorListeners: GpsErrorCallback[] = [];
  private lastTimestamp = 0;
  private _isActive = false;

  get isActive(): boolean {
    return this._isActive;
  }

  /** Suscribirse a updates GPS */
  onUpdate(cb: GpsCallback): void {
    this.listeners.push(cb);
  }

  /** Suscribirse a errores GPS */
  onError(cb: GpsErrorCallback): void {
    this.errorListeners.push(cb);
  }

  /** Iniciar tracking GPS */
  start(): void {
    if (this.watchId !== null) return;

    if (!navigator.geolocation) {
      console.error('Geolocation API no disponible');
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
    this._isActive = true;
  }

  /** Detener tracking GPS */
  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this._isActive = false;
  }

  /** Limpiar listeners */
  destroy(): void {
    this.stop();
    this.listeners = [];
    this.errorListeners = [];
  }

  private handlePosition(position: GeolocationPosition): void {
    const now = position.timestamp;

    // Throttle updates
    if (now - this.lastTimestamp < GPS_MIN_INTERVAL) return;
    this.lastTimestamp = now;

    const { latitude, longitude, altitude, heading, accuracy, speed } = position.coords;

    // speed viene en m/s, convertir a km/h
    const speedKmh = speed !== null && speed >= 0 ? speed * MS_TO_KMH : 0;

    const data: GpsData = {
      speed: speedKmh,
      latitude,
      longitude,
      altitude,
      heading,
      accuracy,
      timestamp: now,
    };

    this.listeners.forEach((cb) => cb(data));
  }

  private handleError(error: GeolocationPositionError): void {
    console.error('GPS Error:', error.message);
    this.errorListeners.forEach((cb) => cb(error));
  }
}
