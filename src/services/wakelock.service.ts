/**
 * Servicio Wake Lock para mantener la pantalla encendida.
 * Usa la Screen Wake Lock API.
 */
export class WakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private _isActive = false;

  get isActive(): boolean {
    return this._isActive;
  }

  /** Solicitar wake lock */
  async acquire(): Promise<boolean> {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API no soportada');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this._isActive = true;

      this.wakeLock.addEventListener('release', () => {
        this._isActive = false;
      });

      // Re-adquirir cuando la página vuelve a primer plano
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      return true;
    } catch (err) {
      console.error('Error al solicitar Wake Lock:', err);
      return false;
    }
  }

  /** Liberar wake lock */
  async release(): Promise<void> {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
    this._isActive = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  destroy(): void {
    this.release();
  }

  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && this._isActive) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch {
        // Silently fail on re-acquisition
      }
    }
  };
}
