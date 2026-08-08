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
  private calibWarn!: HTMLElement;

  private maxRpm: number = 12000;

  // Data state for rendering
  private currentSpeed: number = 0;
  private currentRpm: number = 0;
  private engineTemp: number | null = null;
  private throttlePos: number | null = null;
  private isHudMode: boolean = false;
  private leanAngle: number = 0;
  private maxLeanLeft: number = 0;
  private maxLeanRight: number = 0;
  private gForceY: number = 0;
  private batteryPct: number = 100;
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
      // data.speed viene en km/h desde GpsService y OBD2Service
      this.currentSpeed = this.unit === 'kmh' ? data.speed : data.speed * 0.621371;
    }
    
    if (data.accuracy !== undefined) {
      this.gpsQuality = data.accuracy <= 8 ? 'excellent' : data.accuracy <= 25 ? 'good' : 'weak';
    }
  }

  updateTrip(data: any): void {
    this.distance = (data.distance || 0) / 1000;
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

  updateObd2Extra(temp: number, throttle: number): void {
    if (temp !== undefined) this.engineTemp = temp;
    if (throttle !== undefined) this.throttlePos = throttle;
  }

  destroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
  }

  updateLanguage(): void {
    // Canvas se re-dibuja continuamente
  }

  setLayout(_layout: 'sport' | 'minimalist' | 'touring'): void {
    // Layout adaptativo automático
  }

  private renderContainer(): void {
    this.container.innerHTML = `
      <div class="dashboard-view" id="dashboard-view" style="position: relative; width: 100%; height: 100%; min-height: 380px; overflow: hidden; background: #08080c;">
        
        <canvas id="dash-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>

        <!-- Botón Fullscreen / Sensores / HUD -->
        <div style="position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; gap: 8px;">
          <button class="btn btn-ghost btn-sm" id="dash-fullscreen-btn" style="padding: 4px 10px; font-size: 11px; background: rgba(255,255,255,0.08); border-radius: 6px; color: #00e5ff; border: 1px solid rgba(0,229,255,0.2);">
            ⛶ PANTALLA COMPLETA
          </button>
          <button class="btn btn-ghost btn-sm" id="dash-hud-btn" style="padding: 4px 10px; font-size: 11px; background: rgba(255,255,255,0.08); border-radius: 6px; color: #ffab00; border: 1px solid rgba(255,171,0,0.2);">
            HUDisplay
          </button>
        </div>

        <!-- Calibration Warning -->
        <div class="dash-calib-warn" id="dash-calib-warn" style="display: none; position: absolute; z-index: 10; top: 50px; width: 100%; justify-content: center;">
          <div style="background: rgba(255,171,0,0.95); padding: 6px 14px; border-radius: 6px; color: #000; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
            <span>${t('dash.alignWarning')}</span>
            <button class="btn btn-sm btn-dark" id="dash-calib-btn">${t('dash.calibrate')}</button>
          </div>
        </div>
      </div>
    `;

    this.dashboardView = this.container.querySelector('#dashboard-view') as HTMLElement;
    this.canvas = this.container.querySelector('#dash-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.calibWarn = this.container.querySelector('#dash-calib-warn') as HTMLElement;

    const fsBtn = this.container.querySelector('#dash-fullscreen-btn');
    fsBtn?.addEventListener('click', async () => {
      try {
        if (this.onStartRequested) {
          await this.onStartRequested();
        }
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
          if ('orientation' in screen && 'lock' in screen.orientation) {
            // @ts-ignore
            await screen.orientation.lock('landscape').catch(() => {});
          }
        } else {
          await document.exitFullscreen().catch(() => {});
        }
      } catch (err) {
        console.warn('Fullscreen toggle:', err);
      }
    });

    const hudBtn = this.container.querySelector('#dash-hud-btn');
    hudBtn?.addEventListener('click', () => {
      this.isHudMode = !this.isHudMode;
      if (this.isHudMode) {
        this.dashboardView.style.transform = 'scaleX(-1)';
      } else {
        this.dashboardView.style.transform = 'scaleX(1)';
      }
    });

    const calibBtn = this.container.querySelector('#dash-calib-btn');
    calibBtn?.addEventListener('click', () => {
      this.onCalibrate?.();
    });

    this.updateClock();
    this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
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
      try {
        this.renderCanvas();
      } catch (err) {
        console.error('Error in render loop:', err);
      }
      this.renderFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  private renderCanvas(): void {
    if (!this.ctx || !this.canvas || !this.dashboardView) return;

    // Redimensionar si cambió el contenedor
    const rect = this.dashboardView.getBoundingClientRect();
    const targetW = Math.floor(rect.width);
    const targetH = Math.floor(rect.height);

    if (targetW > 0 && targetH > 0) {
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    const ctx = this.ctx;

    // Fondo oscuro premium estilo TFT
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, w, h);

    const isLandscape = w > h;
    const rpmRatio = Math.max(0, Math.min(1, this.currentRpm / this.maxRpm));
    const isRaceMode = this.currentSpeed > 15;

    // Shift Light - Destello de aviso de corte
    if (rpmRatio > 0.88) {
      ctx.strokeStyle = (Math.floor(Date.now() / 80) % 2 === 0) ? '#ff1744' : '#d50000';
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, w, h);
    } else if (rpmRatio > 0.68 && isRaceMode) {
      ctx.strokeStyle = 'rgba(255, 171, 0, 0.4)';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, w, h);
    }

    // Top Status Bar (Siempre visible)
    this.drawTopBar(ctx, w);

    if (isLandscape) {
      this.renderLandscape(ctx, w, h, rpmRatio, isRaceMode);
    } else {
      this.renderPortrait(ctx, w, h, rpmRatio, isRaceMode);
    }
  }

  private renderLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, rpmRatio: number, isRaceMode: boolean): void {
    if (isRaceMode) {
      // --- MODO CARRERA LANDSCAPE ---
      // Barra Superior RPM
      const rpmBarH = 18;
      const topY = 48;
      ctx.fillStyle = '#161622';
      ctx.fillRect(30, topY, w - 60, rpmBarH);

      const barFillW = (w - 60) * rpmRatio;
      ctx.fillStyle = rpmRatio > 0.88 ? '#ff1744' : rpmRatio > 0.65 ? '#ffab00' : '#00e5ff';
      ctx.fillRect(30, topY, barFillW, rpmBarH);

      // Velocidad Gigante en el centro
      const speedSize = Math.min(h * 0.55, w * 0.35);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(speedSize)}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(Math.round(this.currentSpeed).toString(), w / 2, h / 2 + 10);

      // Unidad
      ctx.font = `600 ${Math.round(speedSize * 0.16)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(getSpeedUnitLabel(this.unit).toUpperCase(), w / 2, h / 2 + speedSize * 0.42);

      // Trip Info abajo
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillStyle = '#888899';
      ctx.fillText(`${this.distance.toFixed(1)} ${this.unit === 'kmh' ? 'km' : 'mi'}  •  ${this.formatTime(this.elapsedTime)}`, w / 2, h - 22);

    } else {
      // --- MODO TELEMETRÍA LANDSCAPE ---
      const panelWidth = Math.min(220, w * 0.25);

      // Izquierda: Tacómetro RPM
      this.drawTelemetryRpmBar(ctx, 40, 75, 45, h - 145, rpmRatio);
      
      // Motor Info (Temp y Throttle)
      this.drawEngineData(ctx, 105, 75);

      // Centro: Velocímetro
      const speedSize = Math.min(h * 0.45, w * 0.3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(speedSize)}px 'Orbitron', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(Math.round(this.currentSpeed).toString(), w / 2, h / 2 - 15);

      ctx.font = `600 ${Math.round(speedSize * 0.18)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(getSpeedUnitLabel(this.unit).toUpperCase(), w / 2, h / 2 + speedSize * 0.35);

      // Distancia y tiempo
      ctx.font = "15px 'Inter', sans-serif";
      ctx.fillStyle = '#9999aa';
      ctx.fillText(`${this.distance.toFixed(1)} ${this.unit === 'kmh' ? 'km' : 'mi'}  •  ${this.formatTime(this.elapsedTime)}`, w / 2, h - 35);

      // Derecha: Inclinación + G-Force
      this.drawTelemetryRightPanel(ctx, w - panelWidth - 20, 75, panelWidth, h - 145);
    }
  }

  private renderPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, rpmRatio: number, isRaceMode: boolean): void {
    // Barra RPM Superior
    const topBarY = 48;
    ctx.fillStyle = '#161622';
    ctx.fillRect(20, topBarY, w - 40, 14);

    const barFillW = (w - 40) * rpmRatio;
    ctx.fillStyle = rpmRatio > 0.88 ? '#ff1744' : rpmRatio > 0.65 ? '#ffab00' : '#00e5ff';
    ctx.fillRect(20, topBarY, barFillW, 14);

    // Velocidad Principal
    const speedSize = Math.min(w * 0.42, h * 0.35);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(speedSize)}px 'Orbitron', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(Math.round(this.currentSpeed).toString(), w / 2, h * 0.36);

    ctx.font = `700 ${Math.round(speedSize * 0.18)}px 'Inter', sans-serif`;
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(getSpeedUnitLabel(this.unit).toUpperCase(), w / 2, h * 0.36 + speedSize * 0.4);

    // Si no está en modo carrera y hay espacio, mostrar telemetría
    if (!isRaceMode && h > 460) {
      // Inclinación
      const leanY = h * 0.62;
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillStyle = '#888899';
      ctx.fillText('ÁNGULO DE INCLINACIÓN', w / 2, leanY - 24);

      ctx.font = "700 28px 'Orbitron', sans-serif";
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(`${Math.abs(Math.round(this.leanAngle))}°`, w / 2, leanY + 4);

      ctx.font = "13px 'Inter', sans-serif";
      ctx.fillStyle = '#666677';
      ctx.fillText(`L: ${Math.abs(Math.round(this.maxLeanLeft))}°   |   R: ${Math.abs(Math.round(this.maxLeanRight))}°`, w / 2, leanY + 28);

      // G-Force
      const gY = h * 0.78;
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillStyle = '#888899';
      ctx.fillText('FUERZA G', w / 2, gY - 14);

      ctx.font = "700 22px 'Orbitron', sans-serif";
      ctx.fillStyle = this.gForceY >= 0 ? '#00e5ff' : '#ffab00';
      ctx.fillText(`${this.gForceY >= 0 ? '+' : ''}${this.gForceY.toFixed(2)} G`, w / 2, gY + 12);
    }

    // Trip Footer
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillStyle = '#888899';
    ctx.fillText(`${this.distance.toFixed(1)} ${this.unit === 'kmh' ? 'km' : 'mi'}   |   ${this.formatTime(this.elapsedTime)}`, w / 2, h - 25);
  }

  private drawTelemetryRpmBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number) {
    ctx.fillStyle = '#161622';
    ctx.fillRect(x, y, w, h);
    const activeH = h * ratio;
    
    ctx.fillStyle = ratio > 0.88 ? '#ff1744' : ratio > 0.65 ? '#ffab00' : '#00e5ff';
    ctx.fillRect(x, y + (h - activeH), w, activeH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = "700 18px 'Orbitron', sans-serif";
    ctx.fillText(Math.round(this.currentRpm).toString(), x + w / 2, y - 18);
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = '#666677';
    ctx.fillText('RPM', x + w / 2, y - 5);
  }

  private drawEngineData(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (this.engineTemp === null && this.throttlePos === null) return;

    // Temp Box
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, 90, 50, 8);
    } else {
      ctx.rect(x, y, 90, 50);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = '#777788';
    ctx.fillText('TEMP', x + 10, y + 18);

    ctx.font = "700 20px 'Orbitron', sans-serif";
    const tempVal = this.engineTemp ?? 0;
    ctx.fillStyle = tempVal > 105 ? '#ff1744' : tempVal > 95 ? '#ffab00' : '#00e5ff';
    ctx.fillText(`${tempVal}°`, x + 10, y + 40);

    // Throttle Box
    const tY = y + 60;
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, tY, 90, 50, 8);
    } else {
      ctx.rect(x, tY, 90, 50);
    }
    ctx.fill();
    ctx.stroke();

    ctx.font = "11px 'Inter', sans-serif";
    ctx.fillStyle = '#777788';
    ctx.fillText('THROTTLE', x + 10, tY + 18);

    const thr = this.throttlePos ?? 0;
    ctx.font = "700 18px 'Orbitron', sans-serif";
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${Math.round(thr)}%`, x + 10, tY + 40);
    
    // Mini barra throttle
    ctx.fillStyle = '#161622';
    ctx.fillRect(x + 55, tY + 28, 25, 12);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(x + 55, tY + 28, 25 * (thr / 100), 12);
  }

  private drawTelemetryRightPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // Lean Angle Arc Gauge
    const centerX = x + w / 2;
    const centerY = y + 55;
    const radius = 45;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.stroke();
    
    // Aguja Inclinación
    const clampedLean = Math.max(-60, Math.min(60, this.leanAngle));
    const leanRad = (clampedLean - 90) * (Math.PI / 180);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(leanRad) * radius, centerY + Math.sin(leanRad) * radius);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = "700 22px 'Orbitron', sans-serif";
    ctx.fillText(`${Math.abs(Math.round(this.leanAngle))}°`, centerX, centerY + 28);
    
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillStyle = '#777788';
    ctx.fillText(`L:${Math.abs(Math.round(this.maxLeanLeft))}° R:${Math.abs(Math.round(this.maxLeanRight))}°`, centerX, centerY + 46);

    // G-Force Bar
    const gBarTop = centerY + 65;
    const gBarH = Math.max(40, h - (gBarTop - y) - 30);
    const centerG = gBarTop + gBarH / 2;
    
    ctx.fillStyle = '#161622';
    ctx.fillRect(centerX - 16, gBarTop, 32, gBarH);

    // Indicador central 0G
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(centerX - 18, centerG - 1, 36, 2);

    const clampedG = Math.max(-1, Math.min(1, this.gForceY));
    const gFillH = clampedG * (gBarH / 2);

    ctx.fillStyle = this.gForceY >= 0 ? '#00e5ff' : '#ffab00';
    if (this.gForceY >= 0) {
      ctx.fillRect(centerX - 16, centerG - gFillH, 32, gFillH);
    } else {
      ctx.fillRect(centerX - 16, centerG, 32, -gFillH);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = "700 14px 'Orbitron', sans-serif";
    ctx.fillText(`${this.gForceY >= 0 ? '+' : ''}${this.gForceY.toFixed(2)}G`, centerX, gBarTop + gBarH + 18);
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, w: number) {
    ctx.textBaseline = 'middle';

    // Hora
    ctx.textAlign = 'right';
    ctx.font = "600 14px 'Inter', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.clockStr, w - 75, 24);

    // Batería
    const batX = w - 60;
    const batY = 17;
    ctx.fillStyle = '#222233';
    ctx.fillRect(batX, batY, 28, 14);
    ctx.strokeStyle = '#444455';
    ctx.strokeRect(batX, batY, 28, 14);

    const batLevel = Math.max(0, Math.min(1, this.batteryPct / 100));
    ctx.fillStyle = this.isCharging ? '#00e676' : (this.batteryPct <= 20 ? '#ff1744' : '#00e5ff');
    ctx.fillRect(batX + 2, batY + 2, Math.floor(24 * batLevel), 10);

    // GPS Status Indicator
    const gpsColor = this.gpsQuality === 'excellent' ? '#00e676' : this.gpsQuality === 'good' ? '#ffab00' : '#ff1744';
    ctx.fillStyle = gpsColor;
    ctx.beginPath();
    ctx.arc(w - 110, 24, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "600 11px 'Inter', sans-serif";
    ctx.fillStyle = '#888899';
    ctx.textAlign = 'right';
    ctx.fillText('GPS', w - 120, 24);
  }
}
