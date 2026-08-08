import type { TelemetryData } from '../services/telemetry.service';
import { getSpeedUnitLabel } from '../utils/format';
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

  private bottomTimeEl!: HTMLElement;
  private touringCompassArrow!: HTMLElement;
  private touringCompassText!: HTMLElement;

  private rpmFillEl!: SVGPathElement;
  private rpmTextEl!: HTMLElement;
  private maxSpeedValueEl!: HTMLElement;

  // Layout elements
  private dashboardView!: HTMLElement;
  private layout: 'sport' | 'minimalist' | 'touring' = 'sport';

  private clockInterval: number | null = null;
  public onCalibrate: (() => void) | null = null;
  public onExit: (() => void) | null = null;
  public onStartRequested: (() => Promise<void>) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
    this.speedUnitEl.textContent = getSpeedUnitLabel(this.unit);
  }

  updateGps(data: any): void {
    if (this.speedEl && data.speed !== undefined && !isNaN(data.speed)) {
      this.speedEl.textContent = (data.speed * (this.unit === 'kmh' ? 3.6 : 2.23694)).toFixed(0);
    }
    if (this.altitudeEl) {
      this.altitudeEl.textContent = data.altitude ? `${Math.round(data.altitude)}m` : '--';
    }

    // GPS signal quality indicator
    if (this.gpsIndicator) {
      const quality = data.accuracy <= 5 ? 'excellent' : data.accuracy <= 15 ? 'good' : 'weak';
      this.gpsIndicator.className = `dash-gps-dot dash-gps-${quality}`;
    }

    // Update compass if touring
    if (this.layout === 'touring' && this.touringCompassArrow) {
      const h = (typeof data.heading === 'number' && !isNaN(data.heading)) ? data.heading : 0;
      this.touringCompassArrow.style.transform = `rotate(${-h}deg)`;
      if (this.touringCompassText) {
        this.touringCompassText.textContent = this.getHeadingString(h);
      }
    }
  }

  private getHeadingString(heading: number): string {
    const CARDINAL_DIRECTIONS = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSO', 'SO', 'OSO',
      'O', 'ONO', 'NO', 'NNO',
    ];
    const val = Math.floor((heading / 22.5) + 0.5);
    return CARDINAL_DIRECTIONS[(val % 16)];
  }

  updateTrip(data: any): void {
    const dist = (data.distance / 1000).toFixed(1);
    if (this.distanceEl) {
      this.distanceEl.textContent = `${dist} ${this.unit === 'kmh' ? 'km' : 'mi'}`;
    }

    const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return '0m';
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };
    const timeStr = formatTime(data.elapsedTime || 0);
    if (this.bottomTimeEl) {
      this.bottomTimeEl.textContent = timeStr;
    }

    if (this.maxSpeedValueEl && data.maxSpeed !== undefined) {
      this.maxSpeedValueEl.textContent = (data.maxSpeed * (this.unit === 'kmh' ? 3.6 : 2.23694)).toFixed(0);
    }
  }

  updateTelemetry(data: TelemetryData): void {
    // Show/hide calibration warning
    const warnEl = this.container.querySelector('#dash-calib-warn') as HTMLElement;
    if (warnEl) {
      if (data.needsCalibration) {
        warnEl.classList.add('active');
      } else {
        warnEl.classList.remove('active');
      }
    }

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
    this.render();
  }

  setLayout(layout: 'sport' | 'minimalist' | 'touring'): void {
    if (this.layout === layout) return;
    this.layout = layout;
    
    if (this.dashboardView) {
      this.dashboardView.classList.remove('layout-sport', 'layout-minimalist', 'layout-touring');
      this.dashboardView.classList.add(`layout-${layout}`);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard-view layout-${this.layout}" id="dashboard-view">
        
        <!-- Start Overlay -->
        <div class="dash-start-overlay" id="dash-start-overlay">
          <div class="dash-start-card">
            <div class="dash-start-preview">
              <span class="dash-start-preview-label">${t('dash.trip')}</span>
              <div class="dash-start-preview-value" id="dash-start-preview-value">0</div>
              <div class="dash-start-preview-unit">KM/H</div>
            </div>
            <button class="btn btn-primary btn-lg" id="dash-start-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              ${t('dash.start')}
            </button>
          </div>
        </div>

        <!-- Calibration Warning -->
        <div class="dash-calib-warn" id="dash-calib-warn">
          <span>${t('dash.alignWarning')}</span>
          <button class="btn btn-sm btn-warning" id="dash-calib-btn">${t('dash.calibrate')}</button>
        </div>

        <!-- Top Bar: Clock, GPS, Battery -->
        <div class="dash-top-bar">
          <button class="btn btn-ghost btn-sm" id="dash-exit-btn" style="padding: 4px 8px; color: var(--text-muted);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <div class="dash-clock-group" style="margin-left: auto;">
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

          <!-- Left: G-Force Column (Sport) -->
          <div class="dash-left-col">
            <div class="dash-sport-only dash-gforce-col">
              <div class="dash-gforce-label">${t('dash.accel')}</div>
              <div class="dash-gforce-track">
                <div class="dash-gforce-zero"></div>
                <div class="dash-gforce-fill" id="dash-gforce-fill"></div>
              </div>
              <div class="dash-gforce-label">${t('dash.brake')}</div>
              <div class="dash-gforce-value" id="dash-gforce-value">+0.00G</div>
            </div>
          </div>

          <!-- Center: Speed & Tachometer Arc -->
          <div class="dash-speed-col">
            <div class="dash-gauge-hub">
              <!-- SVG Arc -->
              <svg class="dash-rpm-svg" viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
                <!-- Track -->
                <path d="M 25 130 A 115 115 0 0 1 255 130" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10" stroke-linecap="round"/>
                <!-- Fill -->
                <path id="dash-rpm-fill" d="M 25 130 A 115 115 0 0 1 255 130" fill="none" stroke="var(--accent-green)" stroke-width="10" stroke-linecap="round" stroke-dasharray="361" stroke-dashoffset="361" class="dash-rpm-fill"/>
              </svg>
              
              <!-- Top RPM Reading -->
              <div class="dash-gauge-header">
                <span class="dash-rpm-num" id="dash-rpm-text">0</span>
                <span class="dash-rpm-lbl">RPM</span>
              </div>

              <!-- Center Speed Display -->
              <div class="dash-gauge-body">
                <div class="dash-speed-value" id="dash-speed">0</div>
                <div class="dash-speed-footer">
                  <span class="dash-speed-unit" id="dash-speed-unit">km/h</span>
                  <span class="dash-max-badge">MAX <strong id="dash-max-speed-value">0</strong></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Lean Angle (Sport) or Compass (Touring) -->
          <div class="dash-right-col">
            <!-- Sport Lean -->
            <div class="dash-sport-only dash-lean-col">
              <div class="dash-lean-header">
                <span class="dash-lean-max-l" id="dash-max-lean-l">0°</span>
                <span class="dash-lean-title">${t('dash.lean')}</span>
                <span class="dash-lean-max-r" id="dash-max-lean-r">0°</span>
              </div>
              <div class="dash-lean-gauge">
                <svg class="dash-lean-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
                  <line x1="20" y1="110" x2="28" y2="104" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line x1="37" y1="80"  x2="46" y2="80"  stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line x1="65" y1="55"  x2="71" y2="62"  stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line x1="100" y1="30" x2="100" y2="40" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
                  <line x1="135" y1="55" x2="129" y2="62" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line x1="163" y1="80" x2="154" y2="80" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line x1="180" y1="110" x2="172" y2="104" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
                  <line id="dash-lean-needle" x1="100" y1="110" x2="100" y2="40" stroke="var(--accent-cyan)" stroke-width="2.5" stroke-linecap="round" class="dash-lean-needle"/>
                </svg>
              </div>
              <div class="dash-lean-value" id="dash-lean-current">0°</div>
            </div>

            <!-- Touring Compass -->
            <div class="dash-touring-only dash-touring-compass">
              <div class="touring-compass-circle">
                <div class="touring-compass-arrow" id="dash-touring-compass-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l4 10-4-2-4 2 4-10z"/></svg>
                </div>
              </div>
              <div class="touring-compass-text" id="dash-touring-compass-text">N</div>
            </div>
          </div>
        </div>

        <!-- Bottom Bar: Distance, Time, Altitude -->
        <div class="dash-bottom-bar">
          <div class="dash-info-item">
            <span class="dash-info-label">${t('trip.distance')}</span>
            <span class="dash-info-value" id="dash-distance">0 m</span>
          </div>
          <div class="dash-info-item">
            <span class="dash-info-label">${t('trip.time')}</span>
            <span class="dash-info-value" id="dash-bottom-time">00:00</span>
          </div>
          <div class="dash-info-item">
            <span class="dash-info-label">${t('dash.alt')}</span>
            <span class="dash-info-value" id="dash-altitude">--</span>
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

    this.bottomTimeEl = this.container.querySelector('#dash-bottom-time')!;
    this.touringCompassArrow = this.container.querySelector('.touring-compass-arrow') as HTMLElement;
    this.touringCompassText = this.container.querySelector('#dash-touring-compass-text') as HTMLElement;

    this.rpmFillEl = this.container.querySelector('#dash-rpm-fill') as SVGPathElement;
    this.rpmTextEl = this.container.querySelector('#dash-rpm-text') as HTMLElement;
    this.maxSpeedValueEl = this.container.querySelector('#dash-max-speed-value') as HTMLElement;

    // Exit Button
    const exitBtn = this.container.querySelector('#dash-exit-btn');
    exitBtn?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
      this.onExit?.();
    });

    // Start Button (Request Microphones & Sensors)
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Fullscreen Enter Button
    const startBtn = this.container.querySelector('#dash-start-btn');
    const overlay = this.container.querySelector('#dash-start-overlay') as HTMLElement;
    
    startBtn?.addEventListener('click', async () => {
      try {
        if (this.onStartRequested) {
          await this.onStartRequested();
        }
        await document.documentElement.requestFullscreen().catch(e => console.warn('Fullscreen ignored', e));
        if ('orientation' in screen && 'lock' in screen.orientation) {
          // @ts-ignore
          await screen.orientation.lock('landscape').catch(e => console.warn('Orientation lock failed', e));
        }
        overlay.style.display = 'none';
      } catch (e) {
        console.error('Start failed', e);
        overlay.style.display = 'none';
      }
    });

    this.dashboardView = this.container.querySelector('#dashboard-view') as HTMLElement;
    
    // Listen for fullscreen change to show overlay again if they exit
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen, show overlay again
        if (overlay) overlay.style.display = 'flex';
      }
    });

    // Calibration button
    const calibBtn = this.container.querySelector('#dash-calib-btn');
    calibBtn?.addEventListener('click', () => {
      this.onCalibrate?.();
    });
  }

  updateRpm(rpm: number): void {
    if (!this.rpmFillEl || !this.rpmTextEl) return;
    
    this.rpmTextEl.textContent = Math.round(rpm).toString();

    // Animación SVG arco (0 a 12000 RPM)
    const MAX_RPM = 12000;
    const clampedRpm = Math.max(0, Math.min(rpm, MAX_RPM));
    const percentage = clampedRpm / MAX_RPM;
    
    // dasharray = 361 (pi * 115). offset = 361 - (percentage * 361)
    const offset = 361 - (percentage * 361);
    this.rpmFillEl.style.strokeDashoffset = offset.toString();

    // Color por rango
    if (percentage > 0.85) {
      this.rpmFillEl.style.stroke = 'var(--accent-red)';
      this.rpmTextEl.style.color = 'var(--accent-red)';
    } else if (percentage > 0.65) {
      this.rpmFillEl.style.stroke = 'var(--accent-yellow)';
      this.rpmTextEl.style.color = 'var(--accent-yellow)';
    } else {
      this.rpmFillEl.style.stroke = 'var(--accent-green)';
      this.rpmTextEl.style.color = 'var(--accent-green)';
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.clockEl.textContent = now.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
