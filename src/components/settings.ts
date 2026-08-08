import type { AppSettings } from '../utils/constants';
import { t } from '../utils/i18n';

/**
 * Componente de configuración.
 * Permite ajustar unidades, límites de velocidad, modo nocturno, etc.
 */
export class SettingsComponent {
  private container: HTMLElement;
  private settings: AppSettings;
  private canInstall = false;

  public onChange: ((settings: AppSettings) => void) | null = null;
  public onInstallClick: (() => void) | null = null;

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

  setInstallAvailable(available: boolean): void {
    this.canInstall = available;
    const installRow = this.container.querySelector('#setting-install-row') as HTMLElement;
    if (installRow) {
      installRow.style.display = available ? 'flex' : 'none';
    }
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
      <div class="settings-view" id="settings-view">
        <h2 class="section-title">
          <span class="section-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
          ${t('settings.title')}
        </h2>

        <div class="settings-group">
          <div class="settings-group-title">${t('settings.speed')}</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">${t('settings.unit.title')}</span>
              <span class="setting-desc">${t('settings.unit.desc')}</span>
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
              <span class="setting-label">${t('settings.limit.title')}</span>
              <span class="setting-desc">${t('settings.limit.desc')}</span>
            </div>
            <div class="setting-control">
              <input type="number" id="setting-speed-limit" class="setting-input"
                value="${this.settings.speedLimit}" min="20" max="300" step="10" />
              <span class="setting-suffix">${this.settings.unit === 'kmh' ? 'km/h' : 'mph'}</span>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">${t('settings.alerts')}</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">${t('settings.alert.title')}</span>
              <span class="setting-desc">${t('settings.alert.desc')}</span>
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
              <span class="setting-label">${t('settings.sound.title')}</span>
              <span class="setting-desc">${t('settings.sound.desc')}</span>
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
          <div class="settings-group-title">${t('settings.display')}</div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">${t('settings.theme.title')}</span>
              <span class="setting-desc">${t('settings.theme.desc')}</span>
            </div>
            <div class="setting-control">
              <select id="setting-theme" class="setting-select">
                <option value="auto" ${this.settings.nightMode === 'auto' ? 'selected' : ''}>${t('settings.theme.auto')}</option>
                <option value="on" ${this.settings.nightMode === 'on' ? 'selected' : ''}>${t('settings.theme.dark')}</option>
                <option value="off" ${this.settings.nightMode === 'off' ? 'selected' : ''}>${t('settings.theme.light')}</option>
              </select>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">${t('settings.wakelock.title')}</span>
              <span class="setting-desc">${t('settings.wakelock.desc')}</span>
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
              <span class="setting-label">${t('settings.fullscreen.title')}</span>
              <span class="setting-desc">${t('settings.fullscreen.desc')}</span>
            </div>
            <div class="setting-control">
              <button class="btn btn-ghost btn-sm" id="setting-fullscreen">
                ${document.fullscreenElement ? t('settings.fullscreen.on') : t('settings.fullscreen.off')}
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">${t('settings.lang.title')}</span>
              <span class="setting-desc">${t('settings.lang.desc')}</span>
            </div>
            <div class="setting-control">
              <select id="setting-lang" class="setting-select">
                <option value="es" ${this.settings.language === 'es' ? 'selected' : ''}>Español</option>
                <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
          </div>

          <div class="setting-item" id="setting-install-row" style="display: ${this.canInstall ? 'flex' : 'none'};">
            <div class="setting-info">
              <span class="setting-label" style="color: var(--accent-cyan);">${t('settings.install.title')}</span>
              <span class="setting-desc">${t('settings.install.desc')}</span>
            </div>
            <div class="setting-control">
              <button class="btn btn-primary btn-sm" id="setting-install-btn">
                ${t('settings.install.btn')}
              </button>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <p class="settings-app-name">MotoSpeed v1.0</p>
          <p class="settings-app-desc">${t('settings.desc')}</p>
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
    const langEl = this.container.querySelector('#setting-lang') as HTMLSelectElement;
    const themeEl = this.container.querySelector('#setting-theme') as HTMLSelectElement;
    const installBtn = this.container.querySelector('#setting-install-btn') as HTMLButtonElement;

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

    themeEl.addEventListener('change', () => {
      this.settings.nightMode = themeEl.value as 'auto' | 'on' | 'off';
      this.emitChange();
    });

    langEl.addEventListener('change', () => {
      this.settings.language = langEl.value as 'es' | 'en';
      this.emitChange();
    });

    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        fullscreenBtn.textContent = t('settings.fullscreen.off');
      } else {
        document.documentElement.requestFullscreen();
        fullscreenBtn.textContent = t('settings.fullscreen.on');
      }
    });

    installBtn?.addEventListener('click', () => {
      this.onInstallClick?.();
    });
  }

  private emitChange(): void {
    this.onChange?.({ ...this.settings });
  }
}
