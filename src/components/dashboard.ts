import type { GpsData } from '../services/gps.service';
import type { TelemetryData } from '../services/telemetry.service';
import { formatSpeed, getSpeedUnitLabel } from '../utils/format';

/**
 * Componente Tablero (Dashboard).
 * Vista unificada tipo TFT para motos con telemetría.
 */
export class DashboardComponent {
  private container: HTMLElement;
  private unit: 'kmh' | 'mph' = 'kmh';

  // DOM Elements
  private speedEl!: HTMLElement;
  private speedUnitEl!: HTMLElement;
  private leanAngleEl!: HTMLElement;
  private leanBarFill!: HTMLElement;
  private maxLeanLeftEl!: HTMLElement;
  private maxLeanRightEl!: HTMLElement;
  private gForceMarker!: HTMLElement;
  private batteryEl!: HTMLElement;
  private clockEl!: HTMLElement;

  private clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
    this.speedUnitEl.textContent = getSpeedUnitLabel(this.unit);
  }

  updateGps(data: GpsData): void {
    this.speedEl.textContent = formatSpeed(data.speed, this.unit);
  }

  updateTelemetry(data: TelemetryData): void {
    // Lean Angle text
    this.leanAngleEl.textContent = `${Math.abs(Math.round(data.leanAngle))}°`;
    
    // Lean Angle Bar (Rotation)
    // Positive gamma is lean right, negative is lean left
    this.leanBarFill.style.transform = `rotate(${data.leanAngle}deg)`;

    // Max Leans
    this.maxLeanLeftEl.textContent = `${Math.abs(Math.round(data.maxLeanLeft))}°`;
    this.maxLeanRightEl.textContent = `${Math.abs(Math.round(data.maxLeanRight))}°`;

    // G-Force Indicator (Vertical bar)
    // data.gForceY: Positive is Accel, Negative is Brake.
    // Let's assume max scale is 1G (-1 to 1) -> maps to -50% to 50%
    let gPercent = data.gForceY * 50; 
    // Clamp between -50 and 50
    gPercent = Math.max(-50, Math.min(50, gPercent));
    
    // Translate marker
    this.gForceMarker.style.transform = `translateY(${-gPercent}px)`; // Negative because Up is -Y in CSS
  }

  updateBattery(level: number, charging: boolean): void {
    const pct = Math.round(level * 100);
    const icon = charging ? '⚡' : '🔋';
    this.batteryEl.textContent = `${icon} ${pct}%`;
  }

  destroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard-view" id="dashboard-view">
        
        <div class="dashboard-header">
          <div class="dash-clock" id="dash-clock">--:--</div>
          <div class="dash-battery" id="dash-battery">🔋 --%</div>
        </div>

        <div class="dashboard-center">
          <div class="dash-speed-group">
            <div class="dash-speed-value" id="dash-speed">0</div>
            <div class="dash-speed-unit" id="dash-speed-unit">km/h</div>
          </div>
        </div>

        <div class="dashboard-footer">
          <!-- G-Force Meter -->
          <div class="dash-gforce">
            <div class="gforce-label">G-Force</div>
            <div class="gforce-bar-bg">
              <div class="gforce-marker" id="dash-gforce-marker"></div>
            </div>
            <div class="gforce-labels">
              <span>+</span>
              <span>-</span>
            </div>
          </div>

          <!-- Lean Angle -->
          <div class="dash-lean">
            <div class="lean-max-left" id="dash-max-lean-l">0°</div>
            <div class="lean-arc-container">
              <div class="lean-arc-bg"></div>
              <div class="lean-arc-fill" id="dash-lean-fill"></div>
              <div class="lean-current" id="dash-lean-current">0°</div>
            </div>
            <div class="lean-max-right" id="dash-max-lean-r">0°</div>
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this.speedEl = this.container.querySelector('#dash-speed')!;
    this.speedUnitEl = this.container.querySelector('#dash-speed-unit')!;
    this.leanAngleEl = this.container.querySelector('#dash-lean-current')!;
    this.leanBarFill = this.container.querySelector('#dash-lean-fill')!;
    this.maxLeanLeftEl = this.container.querySelector('#dash-max-lean-l')!;
    this.maxLeanRightEl = this.container.querySelector('#dash-max-lean-r')!;
    this.gForceMarker = this.container.querySelector('#dash-gforce-marker')!;
    this.batteryEl = this.container.querySelector('#dash-battery')!;
    this.clockEl = this.container.querySelector('#dash-clock')!;

    // Clock updater
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  private updateClock(): void {
    const now = new Date();
    this.clockEl.textContent = now.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
