import type { TripData } from '../services/trip.service';
import { formatDistance, formatTime, formatSpeed, formatAltitude, getSpeedUnitLabel } from '../utils/format';
import { t } from '../utils/i18n';

/**
 * Panel de viaje: muestra estadísticas del viaje actual
 * con controles de Start/Pause/Reset.
 */
export class TripPanelComponent {
  private container: HTMLElement;
  private unit: 'kmh' | 'mph' = 'kmh';

  // Callbacks
  public onStart: (() => void) | null = null;
  public onPause: (() => void) | null = null;
  public onReset: (() => void) | null = null;
  public onSave: (() => void) | null = null;

  // DOM elements
  private distanceEl!: HTMLElement;
  private timeEl!: HTMLElement;
  private avgSpeedEl!: HTMLElement;
  private maxSpeedEl!: HTMLElement;
  private altitudeEl!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;
  private statusEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
  }

  /** Actualizar datos del panel */
  update(data: TripData): void {
    const safeData = {
      ...data,
      distance: Number.isFinite(data.distance) ? data.distance : 0,
      elapsedTime: Number.isFinite(data.elapsedTime) ? data.elapsedTime : 0,
      avgSpeed: Number.isFinite(data.avgSpeed) ? data.avgSpeed : 0,
      maxSpeed: Number.isFinite(data.maxSpeed) ? data.maxSpeed : 0,
      altitude: typeof data.altitude === 'number' && Number.isFinite(data.altitude) ? data.altitude : null,
    };

    this.distanceEl.textContent = formatDistance(safeData.distance, this.unit);
    this.timeEl.textContent = formatTime(safeData.elapsedTime);
    this.avgSpeedEl.textContent = `${formatSpeed(safeData.avgSpeed, this.unit)} ${getSpeedUnitLabel(this.unit)}`;
    this.maxSpeedEl.textContent = `${formatSpeed(safeData.maxSpeed, this.unit)} ${getSpeedUnitLabel(this.unit)}`;
    this.altitudeEl.textContent = formatAltitude(safeData.altitude);

    const stateLabels = { 
      idle: t('trip.status.idle'), 
      running: t('trip.status.running'), 
      paused: t('trip.status.paused') 
    };
    const stateClasses = { idle: 'status-idle', running: 'status-running', paused: 'status-paused' };
    this.statusEl.textContent = stateLabels[safeData.state] || t('trip.status.idle');
    this.statusEl.className = `trip-status ${stateClasses[safeData.state] || 'status-idle'}`;

    this.startBtn.style.display = safeData.state !== 'running' ? '' : 'none';
    this.pauseBtn.style.display = safeData.state === 'running' ? '' : 'none';
    this.resetBtn.style.display = safeData.state !== 'idle' ? '' : 'none';
    this.saveBtn.style.display = safeData.state === 'paused' ? '' : 'none';

    this.startBtn.innerHTML = safeData.state === 'paused'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${t('trip.resume')}`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${t('trip.start')}`;
  }

  destroy(): void {
    // Cleanup handled by parent
  }

  /** Re-renderizar si cambia el idioma */
  updateLanguage(): void {
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="trip-panel" id="trip-view">
        <h2 class="section-title">
          <span class="section-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg></span>
          ${t('trip.title')}
        </h2>

        <div class="trip-status status-idle" id="trip-status">${t('trip.status.idle')}</div>

        <div class="trip-grid">
          <div class="trip-card">
            <div class="trip-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg></div>
            <div class="trip-card-value" id="trip-distance">0 m</div>
            <div class="trip-card-label">${t('trip.distance')}</div>
          </div>
          <div class="trip-card">
            <div class="trip-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/><path d="M6.38 18.7 4 21"/><path d="M17.64 18.67 20 21"/></svg></div>
            <div class="trip-card-value" id="trip-time">00:00:00</div>
            <div class="trip-card-label">${t('trip.time')}</div>
          </div>
          <div class="trip-card">
            <div class="trip-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
            <div class="trip-card-value" id="trip-avg-speed">0 km/h</div>
            <div class="trip-card-label">${t('trip.avgSpeed')}</div>
          </div>
          <div class="trip-card">
            <div class="trip-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
            <div class="trip-card-value" id="trip-max-speed">0 km/h</div>
            <div class="trip-card-label">${t('trip.maxSpeed')}</div>
          </div>
          <div class="trip-card trip-card-wide">
            <div class="trip-card-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg></div>
            <div class="trip-card-value" id="trip-altitude">--</div>
            <div class="trip-card-label">${t('trip.altitude')}</div>
          </div>
        </div>

        <div class="trip-controls">
          <button class="btn btn-primary" id="trip-start-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${t('trip.start')}</button>
          <button class="btn btn-warning" id="trip-pause-btn" style="display:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> ${t('trip.pause')}</button>
          <button class="btn btn-danger" id="trip-reset-btn" style="display:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> ${t('trip.reset')}</button>
          <button class="btn btn-success" id="trip-save-btn" style="display:none"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ${t('trip.save')}</button>
        </div>
      </div>
    `;

    // Cache elements
    this.distanceEl = this.container.querySelector('#trip-distance')!;
    this.timeEl = this.container.querySelector('#trip-time')!;
    this.avgSpeedEl = this.container.querySelector('#trip-avg-speed')!;
    this.maxSpeedEl = this.container.querySelector('#trip-max-speed')!;
    this.altitudeEl = this.container.querySelector('#trip-altitude')!;
    this.startBtn = this.container.querySelector('#trip-start-btn')!;
    this.pauseBtn = this.container.querySelector('#trip-pause-btn')!;
    this.resetBtn = this.container.querySelector('#trip-reset-btn')!;
    this.saveBtn = this.container.querySelector('#trip-save-btn')!;
    this.statusEl = this.container.querySelector('#trip-status')!;

    // Events
    this.startBtn.addEventListener('click', () => this.onStart?.());
    this.pauseBtn.addEventListener('click', () => this.onPause?.());
    this.resetBtn.addEventListener('click', () => {
      if (window.confirm(t('trip.resetConfirm'))) {
        this.onReset?.();
      }
    });
    this.saveBtn.addEventListener('click', () => this.onSave?.());
  }
}
