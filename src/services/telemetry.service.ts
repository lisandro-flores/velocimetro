export interface TelemetryData {
  /** Inclinación lateral en grados (Lean Angle). Positivo = Derecha, Negativo = Izquierda */
  leanAngle: number;
  /** Inclinación máxima a la derecha */
  maxLeanRight: number;
  /** Inclinación máxima a la izquierda */
  maxLeanLeft: number;
  /** Fuerza G en aceleración/frenado (eje Y). Positivo = Aceleración, Negativo = Frenado */
  gForceY: number;
  /** Fuerza G máxima en aceleración */
  maxGForceAccel: number;
  /** Fuerza G máxima en frenada (negativo) */
  maxGForceBrake: number;
}

export type TelemetryCallback = (data: TelemetryData) => void;

/**
 * Servicio de Telemetría.
 * Extrae ángulo de inclinación y fuerzas G usando los sensores del dispositivo.
 */
export class TelemetryService {
  private _isActive = false;
  private listeners: TelemetryCallback[] = [];

  // Data
  private currentLeanAngle = 0;
  private maxLeanRight = 0;
  private maxLeanLeft = 0;
  private currentGForceY = 0;
  private maxGForceAccel = 0;
  private maxGForceBrake = 0;

  get isActive(): boolean {
    return this._isActive;
  }

  start(): void {
    if (this._isActive) return;
    this._isActive = true;

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleOrientation);
    }
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', this.handleMotion);
    }
  }

  stop(): void {
    if (!this._isActive) return;
    this._isActive = false;
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('devicemotion', this.handleMotion);
  }

  resetMaxValues(): void {
    this.maxLeanRight = 0;
    this.maxLeanLeft = 0;
    this.maxGForceAccel = 0;
    this.maxGForceBrake = 0;
    this.notifyListeners();
  }

  onUpdate(cb: TelemetryCallback): void {
    this.listeners.push(cb);
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    // gamma represents left/right tilt [-90 to 90] when phone is portrait
    // When phone is landscape (dashboard mode), beta is left/right tilt.
    // Let's assume portrait for now, or adapt dynamically.
    // In landscape, we might need to check window.orientation.
    let angle = 0;
    const orientation = screen.orientation?.type || 'portrait-primary';
    
    if (orientation.includes('landscape')) {
      // In landscape, beta is lean angle
      angle = event.beta || 0;
      if (orientation === 'landscape-secondary') {
        angle = -angle; // invert
      }
    } else {
      // In portrait, gamma is lean angle
      angle = event.gamma || 0;
    }

    // Suavizado EMA para la inclinación
    const alpha = 0.2;
    this.currentLeanAngle = (alpha * angle) + ((1 - alpha) * this.currentLeanAngle);

    // Guardar máximos
    if (this.currentLeanAngle > this.maxLeanRight) {
      this.maxLeanRight = this.currentLeanAngle;
    }
    if (this.currentLeanAngle < this.maxLeanLeft) {
      this.maxLeanLeft = this.currentLeanAngle;
    }

    this.notifyListeners();
  };

  private handleMotion = (event: DeviceMotionEvent): void => {
    // acceleration (without gravity)
    const accel = event.acceleration;
    if (!accel) return;

    // En landscape, la aceleración de avance/frenado es el eje X.
    // En portrait, es el eje Y.
    const orientation = screen.orientation?.type || 'portrait-primary';
    let rawG = 0;

    if (orientation.includes('landscape')) {
      rawG = accel.x || 0;
      if (orientation === 'landscape-primary') {
         rawG = -rawG; // In landscape primary, braking throws you towards +x
      }
    } else {
      rawG = accel.y || 0; 
      // In portrait, braking throws you towards +y
      // Wait, acceleration in Y is negative when accelerating forward, positive when braking.
      rawG = -rawG; 
    }

    // Convertir de m/s^2 a G
    rawG = rawG / 9.81;

    // Suavizado EMA para G-Force
    const alpha = 0.15;
    this.currentGForceY = (alpha * rawG) + ((1 - alpha) * this.currentGForceY);

    // Guardar máximos
    if (this.currentGForceY > this.maxGForceAccel) {
      this.maxGForceAccel = this.currentGForceY;
    }
    if (this.currentGForceY < this.maxGForceBrake) {
      this.maxGForceBrake = this.currentGForceY;
    }

    this.notifyListeners();
  };

  private notifyListeners(): void {
    const data: TelemetryData = {
      leanAngle: this.currentLeanAngle,
      maxLeanRight: this.maxLeanRight,
      maxLeanLeft: this.maxLeanLeft,
      gForceY: this.currentGForceY,
      maxGForceAccel: this.maxGForceAccel,
      maxGForceBrake: this.maxGForceBrake
    };
    this.listeners.forEach(cb => cb(data));
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}
