export interface TelemetryData {
  leanAngle: number;
  maxLeanRight: number;
  maxLeanLeft: number;
  gForceY: number;
  maxGForceAccel: number;
  maxGForceBrake: number;
  needsCalibration: boolean;
}

export type TelemetryCallback = (data: TelemetryData) => void;

export class TelemetryService {
  private _isActive = false;
  private listeners: TelemetryCallback[] = [];

  // Data
  private isCalibrated = false;
  private _needsCalibration = false;
  private rollOffset = 0;
  private rawRoll = 0;
  private lastMotionTime = 0;

  private worker: Worker | null = null;

  get isActive(): boolean {
    return this._isActive;
  }

  calibrate(): void {
    this.rollOffset = this.rawRoll;
    this.isCalibrated = true;
    this._needsCalibration = false;
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

    // Use absolute URL or Vite's ?worker syntax if possible, but standard new Worker should work in modern Vite
    this.worker = new Worker(new URL('../workers/telemetry.worker.ts', import.meta.url), { type: 'module' });
    
    this.worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;
      if (type === 'telemetry') {
        const data: TelemetryData = {
          ...payload,
          needsCalibration: this._needsCalibration
        };
        this.listeners.forEach(cb => cb(data));
      }
    };

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
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  resetMaxValues(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'reset' });
    }
  }

  onUpdate(cb: TelemetryCallback): void {
    this.listeners.push(cb);
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    let roll = 0;
    let pitch = 0;
    const orientation = screen.orientation?.type || 'portrait-primary';
    
    if (orientation.includes('landscape')) {
      roll = event.beta || 0;
      pitch = event.gamma || 0;
      if (orientation === 'landscape-secondary') {
        roll = -roll;
      }
    } else {
      roll = event.gamma || 0;
      pitch = event.beta || 0;
    }

    this.rawRoll = roll;
    let angle = roll - this.rollOffset;

    if (!this.isCalibrated) {
      if (Math.abs(roll) > 15 || Math.abs(pitch) > 60) {
        this._needsCalibration = true;
      } else {
        this._needsCalibration = false;
      }
    }

    if (this.worker) {
      this.worker.postMessage({
        type: 'orientation',
        payload: { angle }
      });
    }
  };

  private handleMotion = (event: DeviceMotionEvent): void => {
    const accel = event.acceleration;
    if (!accel) return;

    const orientation = screen.orientation?.type || 'portrait-primary';
    let rawG = 0;

    if (orientation.includes('landscape')) {
      rawG = accel.x || 0;
      if (orientation === 'landscape-primary') {
         rawG = -rawG; 
      }
    } else {
      rawG = accel.y || 0; 
      rawG = -rawG; 
    }

    rawG = rawG / 9.81;

    const now = event.timeStamp || performance.now();
    let dt = (now - this.lastMotionTime) / 1000;
    if (dt > 0.5 || dt <= 0) dt = 0.02; 
    this.lastMotionTime = now;

    if (this.worker) {
      this.worker.postMessage({
        type: 'motion',
        payload: { dt, rawG }
      });
    }
  };

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}
