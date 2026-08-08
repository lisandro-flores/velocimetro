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
  /** Indica si la alineación actual es pobre y necesita calibración */
  needsCalibration: boolean;
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

  // Calibration Offsets
  private rollOffset = 0;
  private rawRoll = 0;
  private isCalibrated = false;
  private _needsCalibration = false;
  
  private lastMotionTime = 0;

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Toma los ángulos actuales como el "centro 0"
   */
  calibrate(): void {
    // Current raw angles are the offsets
    this.rollOffset = this.rawRoll;
    this.isCalibrated = true;
    this._needsCalibration = false;
    this.notifyListeners();
  }

  async requestSensorsPermission(): Promise<void> {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        await (DeviceOrientationEvent as any).requestPermission();
      } catch (e) {
        console.warn('Orientation permission denied', e);
      }
    }
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        await (DeviceMotionEvent as any).requestPermission();
      } catch (e) {
        console.warn('Motion permission denied', e);
      }
    }
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
    let roll = 0;
    let pitch = 0;
    const orientation = screen.orientation?.type || 'portrait-primary';
    
    if (orientation.includes('landscape')) {
      // In landscape, beta is lean angle (roll), gamma is tilt forward/back (pitch)
      roll = event.beta || 0;
      pitch = event.gamma || 0;
      if (orientation === 'landscape-secondary') {
        roll = -roll; // invert
      }
    } else {
      // In portrait, gamma is lean angle (roll), beta is tilt forward/back (pitch)
      roll = event.gamma || 0;
      pitch = event.beta || 0;
    }

    // We need to store the raw values so the `calibrate()` function can read them
    this.rawRoll = roll;

    let angle = roll - this.rollOffset;

    // Check if it needs calibration (if not manually calibrated yet)
    // If the phone is tilted more than 15 degrees at rest, it's mounted crooked.
    if (!this.isCalibrated) {
      if (Math.abs(roll) > 15 || Math.abs(pitch) > 60) {
        this._needsCalibration = true;
      } else {
        this._needsCalibration = false;
      }
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

    // Filtro Low-Pass (RC) para eliminar ruido de baches y vibración de camino
    const now = event.timeStamp || performance.now();
    let dt = (now - this.lastMotionTime) / 1000;
    if (dt > 0.5 || dt <= 0) dt = 0.02; // Fallback 50Hz
    this.lastMotionTime = now;

    // Frecuencia de corte de 1.5 Hz
    const RC = 1 / (2 * Math.PI * 1.5);
    const alpha = dt / (RC + dt);

    // Rechazo de picos físicos imposibles (ej. bache masivo que da un salto > 2G en ms)
    if (Math.abs(rawG - this.currentGForceY) > 2.0) {
      rawG = this.currentGForceY; 
    }

    this.currentGForceY = this.currentGForceY + alpha * (rawG - this.currentGForceY);

    // Deadband para estabilizar en 0 cuando está detenido
    if (Math.abs(this.currentGForceY) < 0.03) {
      this.currentGForceY = 0;
    }

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
      maxGForceBrake: this.maxGForceBrake,
      needsCalibration: this._needsCalibration
    };
    this.listeners.forEach(cb => cb(data));
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}
