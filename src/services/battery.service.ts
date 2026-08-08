export type BatteryCallback = (level: number, charging: boolean) => void;

/**
 * Servicio para obtener el estado de la batería usando la Battery Status API.
 * Nota: Puede no estar soportado en Safari/iOS.
 */
export class BatteryService {
  private batteryManager: any = null;
  private listeners: BatteryCallback[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    // @ts-ignore - Battery API is not standard in all browsers
    if ('getBattery' in navigator) {
      try {
        // @ts-ignore
        this.batteryManager = await navigator.getBattery();
        
        // Emit initial value
        this.notifyListeners();

        // Listen for changes
        this.batteryManager.addEventListener('levelchange', () => this.notifyListeners());
        this.batteryManager.addEventListener('chargingchange', () => this.notifyListeners());
      } catch (err) {
        console.warn('Battery API failed to initialize', err);
      }
    } else {
      console.warn('Battery API not supported on this browser');
    }
  }

  onUpdate(cb: BatteryCallback): void {
    this.listeners.push(cb);
    if (this.batteryManager) {
      // Trigger immediately for new listeners if we have data
      cb(this.batteryManager.level, this.batteryManager.charging);
    }
  }

  private notifyListeners(): void {
    if (!this.batteryManager) return;
    this.listeners.forEach(cb => cb(this.batteryManager.level, this.batteryManager.charging));
  }

  destroy(): void {
    if (this.batteryManager) {
      this.batteryManager.removeEventListener('levelchange', () => this.notifyListeners());
      this.batteryManager.removeEventListener('chargingchange', () => this.notifyListeners());
    }
    this.listeners = [];
  }
}
