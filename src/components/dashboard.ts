import type { TelemetryData } from '../services/telemetry.service';
import { getSpeedUnitLabel } from '../utils/format';
import { t } from '../utils/i18n';

export class DashboardComponent {
  private container: HTMLElement;
  private unit: 'kmh' | 'mph' = 'kmh';

  // DOM Elements
  private dashboardView!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  private startOverlay!: HTMLElement;
  private calibWarn!: HTMLElement;

  private layout: 'sport' | 'minimalist' | 'touring' = 'sport';
  private maxRpm: number = 12000;

  // Data state for rendering
  private currentSpeed: number = 0;
  private currentRpm: number = 0;
  private leanAngle: number = 0;
  private maxLeanLeft: number = 0;
  private maxLeanRight: number = 0;
  private gForceY: number = 0;
  private batteryPct: number = 0;
  private isCharging: boolean = false;
  private distance: number = 0;
  private elapsedTime: number = 0;
  private gpsQuality: string = 'weak';
  private needsCalibration: boolean = false;

  private clockStr: string = '--:--';
  private renderFrame: number | null = null;
  private clockInterval: number | null = null;

  public onCalibrate: (() => void) | null = null;
  public onExit: (() => void) | null = null;
  public onStartRequested: (() => Promise<void>) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderContainer();
    this.startRenderLoop();
  }

  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
  }

  setMaxRpm(max: number): void {
    if (max && !isNaN(max)) {
      this.maxRpm = max;
    }
  }

  updateGps(data: any): void {
    if (data.speed !== undefined && !isNaN(data.speed)) {
      this.currentSpeed = data.speed * (this.unit === 'kmh' ? 3.6 : 2.23694);
    }
    
    if (data.accuracy !== undefined) {
      this.gpsQuality = data.accuracy <= 5 ? 'excellent' : data.accuracy <= 15 ? 'good' : 'weak';
    }
  }

  updateTrip(data: any): void {
    this.distance = data.distance / 1000;
    this.elapsedTime = data.elapsedTime || 0;
  }

  updateTelemetry(data: TelemetryData): void {
    this.needsCalibration = data.needsCalibration;
    if (this.calibWarn) {
      this.calibWarn.style.display = this.needsCalibration ? 'flex' : 'none';
    }

    this.leanAngle = data.leanAngle;
    this.maxLeanLeft = data.maxLeanLeft;
    this.maxLeanRight = data.maxLeanRight;
    this.gForceY = data.gForceY;
  }

  updateBattery(level: number, charging: boolean): void {
    this.batteryPct = level * 100;
    this.isCharging = charging;
  }

  updateRpm(rpm: number): void {
    this.currentRpm = rpm;
  }

  destroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
  }

  updateLanguage(): void {
    // Redraw or update text logic if needed
  }

  setLayout(layout: 'sport' | 'minimalist' | 'touring'): void {
    if (this.layout === layout) return;
    this.layout = layout;
  }

  private renderContainer(): void {
    this.container.innerHTML = `
      <div class="dashboard-view" id="dashboard-view" style="position: relative; width: 100%; height: 100%; overflow: hidden; background: #000;">
        
        <canvas id="dash-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>

        <!-- Start Overlay (DOM overlaid on Canvas) -->
        <div class="dash-start-overlay" id="dash-start-overlay" style="position: absolute; z-index: 10; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(0,0,0,0.8);">
          <div class="dash-start-card">
            <button class="btn btn-primary btn-lg" id="dash-start-btn">
              ${t('dash.start')}
            </button>
          </div>
        </div>

        <!-- Calibration Warning -->
        <div class="dash-calib-warn" id="dash-calib-warn" style="display: none; position: absolute; z-index: 10; top: 10%; width: 100%; justify-content: center;">
          <div style="background: rgba(255,171,0,0.9); padding: 8px 16px; border-radius: 8px; color: black; display: flex; align-items: center; gap: 8px;">
            <span>${t('dash.alignWarning')}</span>
            <button class="btn btn-sm btn-dark" id="dash-calib-btn">${t('dash.calibrate')}</button>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm" id="dash-exit-btn" style="position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 8px; color: #aaa; background: rgba(0,0,0,0.5);">
          X
        </button>
      </div>
    `;

    this.dashboardView = this.container.querySelector('#dashboard-view') as HTMLElement;
    this.canvas = this.container.querySelector('#dash-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.startOverlay = this.container.querySelector('#dash-start-overlay') as HTMLElement;
    this.calibWarn = this.container.querySelector('#dash-calib-warn') as HTMLElement;

    const exitBtn = this.container.querySelector('#dash-exit-btn');
    exitBtn?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
      this.onExit?.();
    });

    const startBtn = this.container.querySelector('#dash-start-btn');
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
        this.startOverlay.style.display = 'none';
      } catch (e) {
        console.error('Start failed', e);
        this.startOverlay.style.display = 'none'; // hide anyway
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        if (this.startOverlay) this.startOverlay.style.display = 'flex';
      }
    });

    const calibBtn = this.container.querySelector('#dash-calib-btn');
    calibBtn?.addEventListener('click', () => {
      this.onCalibrate?.();
    });

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.updateClock();
    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
  }

  private resizeCanvas(): void {
    if (this.dashboardView && this.canvas) {
      const rect = this.dashboardView.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.clockStr = now.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.renderCanvas();
      this.renderFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  private renderCanvas(): void {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const rpmRatio = Math.max(0, Math.min(1, this.currentRpm / this.maxRpm));
    
    // RENDER RACE MODE (Speed > 15) vs TELEMETRY MODE (Speed <= 15)
    const isRaceMode = this.currentSpeed > 15;

    // Shift Light - Edge Flash
    if (rpmRatio > 0.88) {
      ctx.strokeStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ff0000' : '#ff4444';
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, w, h);
    } else if (rpmRatio > 0.65 && isRaceMode) {
       // Pre-shift light yellow outline for race mode
       ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
       ctx.lineWidth = 6;
       ctx.strokeRect(0, 0, w, h);
    }

    if (isRaceMode) {
      // --- RACE MODE UI ---
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // RPM Bar (Horizontal across top)
      ctx.fillStyle = '#222';
      ctx.fillRect(20, 40, w - 40, 20);
      
      ctx.fillStyle = rpmRatio > 0.88 ? '#ff0000' : rpmRatio > 0.65 ? '#ffcc00' : '#00cc00';
      ctx.fillRect(20, 40, (w - 40) * rpmRatio, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 240px sans-serif';
      ctx.fillText(Math.round(this.currentSpeed).toString(), w / 2, h / 2 + 20);
      
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(getSpeedUnitLabel(this.unit), w / 2, h / 2 + 150);

    } else {
      // --- TELEMETRY MODE UI ---
      // Left: RPM
      this.drawTelemetryRpmBar(ctx, 40, 80, 40, h - 160, rpmRatio);
      
      // Center: Speed
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 160px sans-serif';
      ctx.fillText(Math.round(this.currentSpeed).toString(), w / 2, h / 2 - 20);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(getSpeedUnitLabel(this.unit), w / 2, h / 2 + 70);

      // Bottom Center: Trip Info
      ctx.font = '16px sans-serif';
      ctx.fillText(`${this.distance.toFixed(1)} ${this.unit === 'kmh' ? 'km' : 'mi'}  |  ${this.formatTime(this.elapsedTime)}`, w / 2, h - 40);

      // Right: Telemetry (Lean + G-Force)
      this.drawTelemetryRightPanel(ctx, w - 240, 80, 200, h - 160);
    }
    
    // Top Bar (Always visible)
    this.drawTopBar(ctx, w);
  }

  private drawTelemetryRpmBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number) {
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    const activeH = h * ratio;
    
    ctx.fillStyle = ratio > 0.88 ? '#ff0000' : ratio > 0.65 ? '#ffcc00' : '#00cc00';
    ctx.fillRect(x, y + (h - activeH), w, activeH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(Math.round(this.currentRpm).toString(), x + w / 2, y - 20);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('RPM', x + w / 2, y - 5);
  }

  private drawTelemetryRightPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Lean Angle Gauge
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 80, 60, Math.PI, 0);
    ctx.stroke();
    
    // Needle
    const clampedLean = Math.max(-60, Math.min(60, this.leanAngle));
    const leanRad = (clampedLean - 90) * (Math.PI / 180);
    ctx.strokeStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 80);
    ctx.lineTo(x + w / 2 + Math.cos(leanRad) * 60, y + 80 + Math.sin(leanRad) * 60);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`${Math.abs(Math.round(this.leanAngle))}°`, x + w / 2, y + 110);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`L: ${Math.abs(Math.round(this.maxLeanLeft))}°   R: ${Math.abs(Math.round(this.maxLeanRight))}°`, x + w / 2, y + 130);

    // G-Force
    ctx.fillStyle = '#222';
    ctx.fillRect(x + w / 2 - 20, y + 160, 40, h - 160);
    
    // 0 is center of the bar
    const gBarH = h - 160;
    const centerG = y + 160 + gBarH / 2;
    // Map -1G to +1G
    const gH = Math.min(Math.max(-1, this.gForceY), 1) * (gBarH / 2);

    ctx.fillStyle = this.gForceY > 0 ? '#00ffff' : '#ff9900';
    if (this.gForceY > 0) {
       ctx.fillRect(x + w / 2 - 20, centerG - gH, 40, gH);
    } else {
       ctx.fillRect(x + w / 2 - 20, centerG, 40, -gH);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`${this.gForceY > 0 ? '+' : ''}${this.gForceY.toFixed(2)}G`, x + w / 2, y + 160 + gBarH + 20);
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, w: number) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.clockStr, w - 80, 20);

    // Battery
    ctx.fillStyle = '#444';
    ctx.fillRect(w - 60, 22, 40, 16);
    ctx.fillStyle = this.batteryPct <= 20 ? '#ff0000' : '#00cc00';
    ctx.fillRect(w - 60, 22, 40 * (this.batteryPct / 100), 16);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${this.isCharging ? '⚡' : ''} ${Math.round(this.batteryPct)}%`, w - 10, 23);

    // GPS
    ctx.fillStyle = this.gpsQuality === 'excellent' ? '#00ff00' : this.gpsQuality === 'good' ? '#ffff00' : '#ff0000';
    ctx.beginPath();
    ctx.arc(w - 140, 30, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}
