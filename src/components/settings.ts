import type { AppSettings } from '../utils/constants';

/**
 * Componente de configuración.
 * Permite ajustar unidades, límites de velocidad, modo nocturno, etc.
 */
export class SettingsComponent {
  private container: HTMLElement;
  private settings: AppSettings;

  public onChange: ((settings: AppSettings) => void) | null = null;

  constructor(container: HTMLElement, settings: AppSettings) {
    this.container = container;
    this.settings = { ...settings };
    this.render();
  }

  /** Actualizar settings desde fuera */
  updateSettings(settings: AppSettings): void {
    this.settings = { ...settings };
    this.render();
  }

  destroy(): void {
    // Cleanup handled by parent
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="settings-view" id="settings-view">
        <h2 class="section-title">
          <span class="section-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
          Configuración
        </h2>

        <div class="settings-group">
          <div class="settings-group-title">Velocidad</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Unidad de velocidad</span>
              <span class="setting-desc">Kilómetros o millas por hora</span>
            </div>
            <div class="setting-control">
              <select id="setting-unit" class="setting-select">
                <option value="kmh" ${this.settings.unit === 'kmh' ? 'selected' : ''}>km/h</option>
                <option value="mph" ${this.settings.unit === 'mph' ? 'selected' : ''}>mph</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Límite de velocidad</span>
              <span class="setting-desc">Alerta al superar este valor</span>
            </div>
            <div class="setting-control">
              <input type="number" id="setting-speed-limit" class="setting-input"
                value="${this.settings.speedLimit}" min="20" max="300" step="10" />
              <span class="setting-suffix">${this.settings.unit === 'kmh' ? 'km/h' : 'mph'}</span>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Alertas</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Alerta de velocidad</span>
              <span class="setting-desc">Vibración y aviso visual</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" id="setting-alert-enabled" ${this.settings.speedAlertEnabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Sonido de alerta</span>
              <span class="setting-desc">Reproducir tono al superar límite</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" id="setting-sound-enabled" ${this.settings.soundEnabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Pantalla</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Pantalla siempre encendida</span>
              <span class="setting-desc">Evitar que se apague la pantalla</span>
            </div>
            <div class="setting-control">
              <label class="toggle">
                <input type="checkbox" id="setting-wakelock" ${this.settings.wakeLockEnabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">Pantalla completa</span>
              <span class="setting-desc">Ocultar barra del navegador</span>
            </div>
            <div class="setting-control">
              <button class="btn btn-ghost btn-sm" id="setting-fullscreen">Activar</button>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <p class="settings-app-name">MotoSpeed v1.0</p>
          <p class="settings-app-desc">Velocímetro PWA para motociclismo</p>
        </div>
      </div>
    `;

    // Bind events
    this.bindEvents();
  }

  private bindEvents(): void {
    const unitEl = this.container.querySelector('#setting-unit') as HTMLSelectElement;
    const limitEl = this.container.querySelector('#setting-speed-limit') as HTMLInputElement;
    const alertEl = this.container.querySelector('#setting-alert-enabled') as HTMLInputElement;
    const soundEl = this.container.querySelector('#setting-sound-enabled') as HTMLInputElement;
    const wakelockEl = this.container.querySelector('#setting-wakelock') as HTMLInputElement;
    const fullscreenBtn = this.container.querySelector('#setting-fullscreen') as HTMLButtonElement;

    unitEl.addEventListener('change', () => {
      this.settings.unit = unitEl.value as 'kmh' | 'mph';
      this.emitChange();
    });

    limitEl.addEventListener('change', () => {
      this.settings.speedLimit = parseInt(limitEl.value) || 120;
      this.emitChange();
    });

    alertEl.addEventListener('change', () => {
      this.settings.speedAlertEnabled = alertEl.checked;
      this.emitChange();
    });

    soundEl.addEventListener('change', () => {
      this.settings.soundEnabled = soundEl.checked;
      this.emitChange();
    });

    wakelockEl.addEventListener('change', () => {
      this.settings.wakeLockEnabled = wakelockEl.checked;
      this.emitChange();
    });

    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        fullscreenBtn.textContent = 'Activar';
      } else {
        document.documentElement.requestFullscreen();
        fullscreenBtn.textContent = 'Desactivar';
      }
    });
  }

  private emitChange(): void {
    this.onChange?.({ ...this.settings });
  }
}
