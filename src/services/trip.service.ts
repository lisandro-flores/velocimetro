import type { GpsData } from './gps.service';
import { haversineDistance } from '../utils/format';
import { MIN_SPEED_THRESHOLD } from '../utils/constants';

export type TripState = 'idle' | 'running' | 'paused';

export interface TripData {
  /** Estado actual del viaje */
  state: TripState;
  /** Distancia total en km */
  distance: number;
  /** Tiempo transcurrido en segundos */
  elapsedTime: number;
  /** Velocidad máxima alcanzada en km/h */
  maxSpeed: number;
  /** Velocidad promedio en km/h */
  avgSpeed: number;
  /** Altitud actual */
  altitude: number | null;
  /** Timestamp de inicio */
  startTime: number | null;
}

export interface TripSummary {
  id: string;
  date: string;
  distance: number;
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
}

/**
 * Servicio de tracking de viaje.
 * Acumula distancia, cronometra el tiempo y calcula estadísticas.
 */
export class TripService {
  private _state: TripState = 'idle';
  private _distance = 0;
  private _maxSpeed = 0;
  private _startTime: number | null = null;
  private _pausedTime = 0;
  private _lastPauseTime: number | null = null;
  private _altitude: number | null = null;

  private lastLat: number | null = null;
  private lastLon: number | null = null;
  private speedSamples: number[] = [];
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private _elapsedTime = 0;

  get state(): TripState {
    return this._state;
  }

  get data(): TripData {
    return {
      state: this._state,
      distance: this._distance,
      elapsedTime: this._elapsedTime,
      maxSpeed: this._maxSpeed,
      avgSpeed: this.calculateAvgSpeed(),
      altitude: this._altitude,
      startTime: this._startTime,
    };
  }

  /** Iniciar viaje */
  start(): void {
    if (this._state === 'running') return;

    if (this._state === 'idle') {
      this._startTime = Date.now();
      this._distance = 0;
      this._maxSpeed = 0;
      this._pausedTime = 0;
      this._elapsedTime = 0;
      this.speedSamples = [];
      this.lastLat = null;
      this.lastLon = null;
    }

    if (this._state === 'paused' && this._lastPauseTime) {
      this._pausedTime += Date.now() - this._lastPauseTime;
    }

    this._state = 'running';
    this.startTimer();
  }

  /** Pausar viaje */
  pause(): void {
    if (this._state !== 'running') return;
    this._state = 'paused';
    this._lastPauseTime = Date.now();
    this.stopTimer();
  }

  /** Resetear viaje */
  reset(): void {
    this._state = 'idle';
    this._distance = 0;
    this._maxSpeed = 0;
    this._startTime = null;
    this._pausedTime = 0;
    this._lastPauseTime = null;
    this._elapsedTime = 0;
    this._altitude = null;
    this.speedSamples = [];
    this.lastLat = null;
    this.lastLon = null;
    this.stopTimer();
  }

  /** Procesar nuevo dato GPS */
  processGpsData(gps: GpsData): void {
    this._altitude = gps.altitude;

    if (this._state !== 'running') return;

    // Actualizar velocidad máxima
    if (gps.speed > this._maxSpeed) {
      this._maxSpeed = gps.speed;
    }

    // Guardar muestra de velocidad para promedio
    if (gps.speed >= MIN_SPEED_THRESHOLD) {
      this.speedSamples.push(gps.speed);
    }

    // Acumular distancia
    if (this.lastLat !== null && this.lastLon !== null) {
      // Solo acumular si hay movimiento real (evitar drift GPS)
      if (gps.speed >= MIN_SPEED_THRESHOLD && gps.accuracy < 30) {
        const dist = haversineDistance(
          this.lastLat, this.lastLon,
          gps.latitude, gps.longitude
        );
        // Filtrar saltos imposibles (> 500m entre muestras)
        if (dist < 0.5) {
          this._distance += dist;
        }
      }
    }

    this.lastLat = gps.latitude;
    this.lastLon = gps.longitude;
  }

  /** Obtener resumen para guardar */
  getSummary(): TripSummary {
    return {
      id: Date.now().toString(36),
      date: new Date(this._startTime || Date.now()).toISOString(),
      distance: this._distance,
      duration: this._elapsedTime,
      maxSpeed: this._maxSpeed,
      avgSpeed: this.calculateAvgSpeed(),
    };
  }

  destroy(): void {
    this.stopTimer();
  }

  private calculateAvgSpeed(): number {
    if (this.speedSamples.length === 0) return 0;
    const sum = this.speedSamples.reduce((a, b) => a + b, 0);
    return sum / this.speedSamples.length;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this._state === 'running' && this._startTime) {
        this._elapsedTime = (Date.now() - this._startTime - this._pausedTime) / 1000;
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
