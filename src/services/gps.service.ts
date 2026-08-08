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
  private smoothedSpeed = 0;
  private lastLat: number | null = null;
  private lastLng: number | null = null;
  private lastHeading: number | null = null;
  private _isActive = false;

  // Kalman Filter state for speed
  private kfSpeed = 0;
  private kfError = 1;
  private kfQ = 0.5; // Process noise

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

    const { latitude, longitude, altitude, accuracy, speed } = position.coords;
    let heading = position.coords.heading;

    // Ignorar lecturas con margen de error excesivo (>25 metros) para evitar picos irreales
    if (accuracy > 25) return;

    let currentSpeedKmh = 0;

    // 1. Si el chipset GNSS da velocidad directa (hardware Doppler), usarla
    if (speed !== null && !isNaN(speed) && speed >= 0) {
      currentSpeedKmh = speed * MS_TO_KMH;
    } else if (this.lastLat !== null && this.lastLng !== null && this.lastTimestamp > 0) {
      // 2. Fallback de cálculo por delta de distancia y tiempo
      const dt = (now - this.lastTimestamp) / 1000;
      if (dt > 0.4 && dt < 6) {
        const distMeters = this.calculateDistance(this.lastLat, this.lastLng, latitude, longitude);
        if (distMeters > Math.max(3, accuracy * 0.4)) {
          currentSpeedKmh = (distMeters / dt) * MS_TO_KMH;
        }
      }
    }

    // 3. Cálculo de Heading (Rumbo hacia el Norte)
    if ((heading === null || isNaN(heading)) && this.lastLat !== null && this.lastLng !== null) {
      if (currentSpeedKmh > 3) {
        heading = this.calculateBearing(this.lastLat, this.lastLng, latitude, longitude);
        this.lastHeading = heading;
      } else {
        heading = this.lastHeading;
      }
    } else if (heading !== null && !isNaN(heading)) {
      this.lastHeading = heading;
    }

    // 4. Filtro de Kalman 1D para suavizado de velocidad
    const diff = Math.abs(currentSpeedKmh - this.kfSpeed);
    let dynamicQ = this.kfQ;
    if (diff > 10) dynamicQ = 5;
    else if (diff > 5) dynamicQ = 2;

    // Predicción
    const pPred = this.kfError + dynamicQ;

    // Actualización (R = ruido de medición basado en accuracy)
    const R = Math.max(1, accuracy * 0.5); 
    const K = pPred / (pPred + R);
    this.kfSpeed = this.kfSpeed + K * (currentSpeedKmh - this.kfSpeed);
    this.kfError = (1 - K) * pPred;

    this.smoothedSpeed = this.kfSpeed;

    // 5. Deadband agresivo en bajas velocidades para matar el drift del GPS
    if (this.smoothedSpeed < 3 && accuracy > 5) {
      this.smoothedSpeed = 0;
      this.kfSpeed = 0;
    } else if (this.smoothedSpeed < 1.0) {
      this.smoothedSpeed = 0;
      this.kfSpeed = 0;
    }

    this.lastLat = latitude;
    this.lastLng = longitude;
    this.lastTimestamp = now;

    const data: GpsData = {
      speed: this.smoothedSpeed,
      latitude,
      longitude,
      altitude,
      heading: this.lastHeading,
      accuracy,
      timestamp: now,
    };

    this.listeners.forEach((cb) => cb(data));
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }

  private handleError(error: GeolocationPositionError): void {
    console.error('GPS Error:', error.message);
    this.errorListeners.forEach((cb) => cb(error));
  }
}
