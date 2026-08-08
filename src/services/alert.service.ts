/**
 * Servicio de alertas de velocidad.
 * Vibra y dispara alertas visuales cuando se supera el límite.
 */
export class AlertService {
  private _isAlerting = false;
  private _speedLimit = 120;
  private _enabled = true;
  private _soundEnabled = true;
  private alertCallback: ((isAlerting: boolean) => void) | null = null;
  private audioCtx: AudioContext | null = null;

  get isAlerting(): boolean {
    return this._isAlerting;
  }

  get speedLimit(): number {
    return this._speedLimit;
  }

  set speedLimit(limit: number) {
    this._speedLimit = limit;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) this.clearAlert();
  }

  set soundEnabled(value: boolean) {
    this._soundEnabled = value;
  }

  /** Registrar callback de alerta visual */
  onAlert(cb: (isAlerting: boolean) => void): void {
    this.alertCallback = cb;
  }

  /** Verificar velocidad contra el límite */
  checkSpeed(currentSpeed: number): void {
    if (!this._enabled) return;

    const shouldAlert = currentSpeed > this._speedLimit;

    if (shouldAlert && !this._isAlerting) {
      this._isAlerting = true;
      this.triggerAlert();
    } else if (!shouldAlert && this._isAlerting) {
      this.clearAlert();
    }
  }

  destroy(): void {
    this.clearAlert();
    this.alertCallback = null;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private triggerAlert(): void {
    // Vibración
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Sonido de alerta
    if (this._soundEnabled) {
      this.playAlertSound();
    }

    // Callback visual
    this.alertCallback?.(true);
  }

  private clearAlert(): void {
    this._isAlerting = false;
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    this.alertCallback?.(false);
  }

  private playAlertSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch {
      // Audio may fail silently
    }
  }
}
