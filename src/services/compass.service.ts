export type CompassCallback = (heading: number) => void;

/**
 * Servicio de brújula que usa DeviceOrientationEvent.
 * Provee el heading magnético en grados (0-360).
 */
export class CompassService {
  private listeners: CompassCallback[] = [];
  private _isActive = false;
  private _heading = 0;
  private boundHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  get isActive(): boolean {
    return this._isActive;
  }

  get heading(): number {
    return this._heading;
  }

  /** Suscribirse a updates de brújula */
  onUpdate(cb: CompassCallback): void {
    this.listeners.push(cb);
  }

  /** Iniciar brújula - solicita permisos si es necesario */
  async start(): Promise<void> {
    if (this._isActive) return;

    // En iOS 13+ se necesita pedir permiso explícitamente
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') {
          console.warn('Permiso de orientación denegado');
          return;
        }
      } catch (e) {
        console.error('Error solicitando permiso de orientación:', e);
        return;
      }
    }

    this.boundHandler = (e: DeviceOrientationEvent) => this.handleOrientation(e);
    window.addEventListener('deviceorientation', this.boundHandler, true);
    this._isActive = true;
  }

  /** Detener brújula */
  stop(): void {
    if (this.boundHandler) {
      window.removeEventListener('deviceorientation', this.boundHandler, true);
      this.boundHandler = null;
    }
    this._isActive = false;
  }

  /** Actualizar heading desde GPS (fallback) */
  updateFromGps(heading: number | null): void {
    if (heading !== null && !this._isActive) {
      this._heading = heading;
      this.listeners.forEach((cb) => cb(heading));
    }
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }

  private handleOrientation(event: DeviceOrientationEvent): void {
    // webkitCompassHeading para iOS, alpha para Android
    let heading: number;

    if ((event as any).webkitCompassHeading !== undefined) {
      heading = (event as any).webkitCompassHeading;
    } else if (event.alpha !== null) {
      // En Android, alpha es relativo al norte magnético cuando absolute=true
      heading = event.absolute ? (360 - event.alpha) % 360 : event.alpha;
    } else {
      return;
    }

    this._heading = heading;
    this.listeners.forEach((cb) => cb(heading));
  }
}
