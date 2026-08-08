import type { GpsData } from '../services/gps.service';
import type { TelemetryData } from '../services/telemetry.service';
import type { TripData } from '../services/trip.service';
import { formatSpeed, getSpeedUnitLabel, formatDistance, formatAltitude } from '../utils/format';
import { t } from '../utils/i18n';

/**
 * Componente Tablero (Dashboard).
 * Vista premium tipo TFT simulando el cluster digital de una moto deportiva.
 * Diseñado para uso horizontal (landscape) en el manubrio.
 */
export class DashboardComponent {
  private container: HTMLElement;
  private unit: 'kmh' | 'mph' = 'kmh';

  // DOM Elements
  private speedEl!: HTMLElement;
  private speedUnitEl!: HTMLElement;
  private leanAngleEl!: HTMLElement;
  private leanNeedle!: HTMLElement;
  private maxLeanLeftEl!: HTMLElement;
  private maxLeanRightEl!: HTMLElement;
  private gForceBar!: HTMLElement;
  private gForceValueEl!: HTMLElement;
  private batteryBarEl!: HTMLElement;
  private batteryPctEl!: HTMLElement;
  private batteryIconEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private altitudeEl!: HTMLElement;
  private distanceEl!: HTMLElement;
  private gpsIndicator!: HTMLElement;

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
    this.altitudeEl.textContent = formatAltitude(data.altitude);

    // GPS signal quality indicator
    const quality = data.accuracy <= 5 ? 'excellent' : data.accuracy <= 15 ? 'good' : 'weak';
    this.gpsIndicator.className = `dash-gps-dot dash-gps-${quality}`;
  }

  updateTrip(data: TripData): void {
    this.distanceEl.textContent = formatDistance(data.distance, this.unit);
  }

  updateTelemetry(data: TelemetryData): void {
    // — Lean Angle —
    const absLean = Math.abs(Math.round(data.leanAngle));
    this.leanAngleEl.textContent = `${absLean}°`;

    // Rotate the needle (clamp to ±60 degrees for visual safety)
    const clampedLean = Math.max(-60, Math.min(60, data.leanAngle));
    this.leanNeedle.style.transform = `rotate(${clampedLean}deg)`;

    // Color the lean angle based on intensity
    if (absLean > 40) {
      this.leanAngleEl.style.color = 'var(--accent-orange)';
    } else if (absLean > 25) {
      this.leanAngleEl.style.color = 'var(--accent-cyan)';
    } else {
      this.leanAngleEl.style.color = 'var(--text-primary)';
    }

    // Max Leans
    this.maxLeanLeftEl.textContent = `${Math.abs(Math.round(data.maxLeanLeft))}°`;
    this.maxLeanRightEl.textContent = `${Math.abs(Math.round(data.maxLeanRight))}°`;

    // — G-Force —
    // Map gForceY to a percentage height. Scale: -1G to +1G → 0% to 100%
    const gNorm = (data.gForceY + 1) / 2; // normalize to 0..1
    const gPct = Math.max(0, Math.min(100, gNorm * 100));
    this.gForceBar.style.height = `${gPct}%`;

    // Color based on accel vs brake
    if (data.gForceY > 0.15) {
      this.gForceBar.style.background = 'var(--accent-cyan)';
      this.gForceBar.style.boxShadow = '0 0 12px var(--accent-cyan)';
    } else if (data.gForceY < -0.15) {
      this.gForceBar.style.background = 'var(--accent-orange)';
      this.gForceBar.style.boxShadow = '0 0 12px var(--accent-orange)';
    } else {
      this.gForceBar.style.background = 'var(--text-muted)';
      this.gForceBar.style.boxShadow = 'none';
    }

    this.gForceValueEl.textContent = `${data.gForceY >= 0 ? '+' : ''}${data.gForceY.toFixed(2)}G`;
  }

  updateBattery(level: number, charging: boolean): void {
    const pct = Math.round(level * 100);
    this.batteryPctEl.textContent = `${pct}%`;
    this.batteryBarEl.style.width = `${pct}%`;

    // Color code battery level
    if (pct <= 20) {
      this.batteryBarEl.style.background = '#ff3d00';
    } else if (pct <= 50) {
      this.batteryBarEl.style.background = 'var(--accent-orange)';
    } else {
      this.batteryBarEl.style.background = 'var(--accent-cyan)';
    }

    this.batteryIconEl.textContent = charging ? '⚡' : '🔋';
  }

  destroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  /** Re-renderizar si cambia el idioma */
  updateLanguage(): void {
    // Only re-render if we need to translate fixed strings.
    // Dashboard mostly updates dynamic data, but some labels like ACCEL, BRAKE, LEAN could be translated.
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard-view" id="dashboard-view">
        
        <!-- Start Overlay -->
        <div class="dash-start-overlay" id="dash-start-overlay">
          <button class="btn btn-primary btn-lg" id="dash-start-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            ${t('dash.start')}
          </button>
        </div>

        <!-- Top Bar: Clock, GPS, Battery -->
        <div class="dash-top-bar">
          <div class="dash-clock-group">
            <span class="dash-gps-dot dash-gps-weak" id="dash-gps-dot"></span>
            <span class="dash-clock" id="dash-clock">--:--</span>
          </div>
          <div class="dash-battery-group">
            <span class="dash-battery-icon" id="dash-battery-icon">🔋</span>
            <div class="dash-battery-shell">
              <div class="dash-battery-fill" id="dash-battery-fill"></div>
            </div>
            <span class="dash-battery-pct" id="dash-battery-pct">--%</span>
          </div>
        </div>

        <!-- Main Area -->
        <div class="dash-main">

          <!-- Left: G-Force Meter -->
          <div class="dash-gforce-col">
            <div class="dash-gforce-label">${t('dash.accel')}</div>
            <div class="dash-gforce-track">
              <div class="dash-gforce-zero"></div>
              <div class="dash-gforce-fill" id="dash-gforce-fill"></div>
            </div>
            <div class="dash-gforce-label">${t('dash.brake')}</div>
            <div class="dash-gforce-value" id="dash-gforce-value">+0.00G</div>
          </div>

          <!-- Center: Speed -->
          <div class="dash-speed-col">
            <div class="dash-speed-value" id="dash-speed">0</div>
            <div class="dash-speed-unit" id="dash-speed-unit">km/h</div>
            <div class="dash-info-row">
              <div class="dash-info-item">
                <span class="dash-info-label">${t('dash.trip')}</span>
                <span class="dash-info-value" id="dash-distance">0 m</span>
              </div>
              <div class="dash-info-item">
                <span class="dash-info-label">${t('dash.alt')}</span>
                <span class="dash-info-value" id="dash-altitude">--</span>
              </div>
            </div>
          </div>

          <!-- Right: Lean Angle -->
          <div class="dash-lean-col">
            <div class="dash-lean-header">
              <span class="dash-lean-max-l" id="dash-max-lean-l">0°</span>
              <span class="dash-lean-title">${t('dash.lean')}</span>
              <span class="dash-lean-max-r" id="dash-max-lean-r">0°</span>
            </div>
            <div class="dash-lean-gauge">
              <!-- The arc background with tick marks -->
              <svg class="dash-lean-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer arc -->
                <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
                <!-- Tick marks every 15 degrees -->
                <line x1="20" y1="110" x2="28" y2="104" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="37" y1="80"  x2="46" y2="80"  stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="65" y1="55"  x2="71" y2="62"  stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="100" y1="30" x2="100" y2="40" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
                <line x1="135" y1="55" x2="129" y2="62" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="163" y1="80" x2="154" y2="80" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <line x1="180" y1="110" x2="172" y2="104" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                <!-- Labels -->
                <text x="12" y="115" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">60</text>
                <text x="100" y="25" fill="rgba(255,255,255,0.5)" font-size="9" text-anchor="middle">0</text>
                <text x="188" y="115" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle">60</text>
                <!-- Needle pivot -->
                <circle cx="100" cy="110" r="5" fill="var(--accent-cyan)"/>
                <!-- Needle -->
                <line id="dash-lean-needle" x1="100" y1="110" x2="100" y2="40" stroke="var(--accent-cyan)" stroke-width="2.5" stroke-linecap="round" class="dash-lean-needle"/>
              </svg>
            </div>
            <div class="dash-lean-value" id="dash-lean-current">0°</div>
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this.speedEl = this.container.querySelector('#dash-speed')!;
    this.speedUnitEl = this.container.querySelector('#dash-speed-unit')!;
    this.leanAngleEl = this.container.querySelector('#dash-lean-current')!;
    this.leanNeedle = this.container.querySelector('#dash-lean-needle')!;
    this.maxLeanLeftEl = this.container.querySelector('#dash-max-lean-l')!;
    this.maxLeanRightEl = this.container.querySelector('#dash-max-lean-r')!;
    this.gForceBar = this.container.querySelector('#dash-gforce-fill')!;
    this.gForceValueEl = this.container.querySelector('#dash-gforce-value')!;
    this.batteryBarEl = this.container.querySelector('#dash-battery-fill')!;
    this.batteryPctEl = this.container.querySelector('#dash-battery-pct')!;
    this.batteryIconEl = this.container.querySelector('#dash-battery-icon')!;
    this.clockEl = this.container.querySelector('#dash-clock')!;
    this.altitudeEl = this.container.querySelector('#dash-altitude')!;
    this.distanceEl = this.container.querySelector('#dash-distance')!;
    this.gpsIndicator = this.container.querySelector('#dash-gps-dot')!;

    // Clock updater
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Fullscreen Enter Button
    const startBtn = this.container.querySelector('#dash-start-btn');
    const overlay = this.container.querySelector('#dash-start-overlay') as HTMLElement;
    
    startBtn?.addEventListener('click', async () => {
      try {
        await document.documentElement.requestFullscreen();
        if ('orientation' in screen && 'lock' in screen.orientation) {
          // @ts-ignore
          await screen.orientation.lock('landscape').catch(e => console.warn('Orientation lock failed', e));
        }
        overlay.style.display = 'none';
      } catch (e) {
        console.error('Fullscreen failed', e);
        overlay.style.display = 'none'; // Hide anyway to let them use it
      }
    });

    // Listen for fullscreen change to show overlay again if they exit
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen, show overlay again
        if (overlay) overlay.style.display = 'flex';
      }
    });
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
