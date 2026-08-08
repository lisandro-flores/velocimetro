import { GpsService } from './services/gps.service';
import { TripService } from './services/trip.service';
import { StorageService } from './services/storage.service';
import { WakeLockService } from './services/wakelock.service';
import { AlertService } from './services/alert.service';
import { TelemetryService } from './services/telemetry.service';
import { BatteryService } from './services/battery.service';
import { TachometerService } from './services/tachometer.service';
import { OBD2Service } from './services/obd2.service';

import { TripPanelComponent } from './components/trip-panel';
import { HistoryComponent } from './components/history';
import { SettingsComponent } from './components/settings';
import { NavbarComponent } from './components/navbar';
import { DashboardComponent } from './components/dashboard';

import type { TabId, AppSettings } from './utils/constants';
import { setLanguage } from './utils/i18n';
import { sanitizeAppSettings } from './utils/validation';

/**
 * Controlador principal de MotoSpeed.
 * Orquesta servicios y componentes, maneja el routing por tabs.
 */
export class App {
  // Servicios
  private gps = new GpsService();
  private trip = new TripService();
  private storage = new StorageService();
  private wakeLock = new WakeLockService();
  private alert = new AlertService();
  private telemetry = new TelemetryService();
  private battery = new BatteryService();
  private tachometer = new TachometerService();
  private obd2 = new OBD2Service();

  // Componentes
  private tripPanel!: TripPanelComponent;
  private history!: HistoryComponent;
  private settings!: SettingsComponent;
  private navbar!: NavbarComponent;
  private dashboard!: DashboardComponent;

  // Estado
  private deferredPrompt: any = null;
  private appSettings: AppSettings;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  // Containers
  private contentEl: HTMLElement;
  private navbarEl: HTMLElement;
  private alertOverlay: HTMLElement;

  constructor() {
    this.appSettings = sanitizeAppSettings(this.storage.getSettings());
    this.contentEl = document.getElementById('app-content')!;
    this.navbarEl = document.getElementById('app-navbar')!;
    this.alertOverlay = document.getElementById('alert-overlay')!;
  }

  /** Iniciar la app */
  async init(): Promise<void> {
    try {
      setLanguage(this.appSettings.language || 'es');
      this.applyTheme(this.appSettings.nightMode);

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        if (this.settings) {
          this.settings.setInstallAvailable(true);
        }
      });

      this.createViewContainers();
      this.initComponents();
      this.initServices();
      this.applySettings(this.appSettings);
      this.switchTab('dashboard');
      this.startUpdateLoop();
    } catch (error) {
      console.error('No se pudo inicializar la app:', error);
      this.showGlobalStatus('No se pudo iniciar la app. Revisa los permisos del navegador.', 'error');
    }
  }

  private createViewContainers(): void {
    this.contentEl.innerHTML = `
      <div class="view" id="view-dashboard" style="display:none"></div>
      <div class="view" id="view-trip" style="display:none"></div>
      <div class="view" id="view-history" style="display:none"></div>
      <div class="view" id="view-settings" style="display:none"></div>
    `;
  }

  private initComponents(): void {
    // Initialize Dashboard
    this.dashboard = new DashboardComponent(
      this.contentEl.querySelector('#view-dashboard') as HTMLElement
    );
    this.dashboard.onCalibrate = () => {
      this.telemetry.calibrate();
    };

    // Inyectar método start del tacómetro y sensores al dashboard tras click
    this.dashboard.onStartRequested = async () => {
      try {
        await this.telemetry.requestSensorsPermission();
        await this.tachometer.start();
      } catch (err) {
        console.warn('Sensors or microphone permission denied or error', err);
      }
    };

    // Trip Panel
    this.tripPanel = new TripPanelComponent(
      document.getElementById('view-trip')!
    );
    this.tripPanel.onStart = () => {
      this.trip.start();
      this.gps.start();
    };
    this.tripPanel.onPause = () => this.trip.pause();
    this.tripPanel.onReset = () => {
      this.trip.reset();
    };
    this.tripPanel.onSave = async () => {
      const summary = this.trip.getSummary();
      if (summary.distance > 0 || summary.duration > 10) {
        await this.storage.saveTrip(summary);
        this.trip.reset();
        this.refreshHistory();
      }
    };

    // History
    this.history = new HistoryComponent(
      document.getElementById('view-history')!
    );
    this.history.onDelete = async (id) => {
      await this.storage.deleteTrip(id);
      this.refreshHistory();
    };
    this.history.onClear = async () => {
      await this.storage.clearTrips();
      this.refreshHistory();
    };

    // Settings
    this.settings = new SettingsComponent(
      document.getElementById('view-settings')!,
      this.appSettings
    );
    this.settings.onChange = (s) => this.saveSettings(s);
    this.settings.onInstallClick = async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          this.settings.setInstallAvailable(false);
          this.deferredPrompt = null;
        }
      }
    };
    if (this.deferredPrompt) {
      this.settings.setInstallAvailable(true);
    }
    
    this.settings.onObd2ConnectClick = async () => {
      try {
        await this.obd2.connect();
        this.showGlobalStatus('OBD2 Conectado con éxito', 'warning');
      } catch (err) {
        console.error(err);
        this.showGlobalStatus('Error al conectar OBD2', 'error');
        throw err;
      }
    };

    // Navbar
    this.navbar = new NavbarComponent(this.navbarEl);
    this.navbar.onTabChange = (tab) => this.switchTab(tab);

    // Fullscreen behavior for dashboard
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        this.navbarEl.style.display = 'none';
        this.contentEl.style.paddingBottom = '0';
        document.body.classList.add('is-fullscreen-dashboard');
      } else {
        this.navbarEl.style.display = '';
        this.contentEl.style.paddingBottom = '';
        document.body.classList.remove('is-fullscreen-dashboard');
      }
    });
  }

  private initServices(): void {
    this.gps.onUpdate((data) => {
      try {
        this.trip.processGpsData(data);
        this.alert.checkSpeed(data.speed);
        
        // Si no hay OBD2, usamos GPS para la UI
        if (!this.obd2.isConnected) {
          this.dashboard.updateGps(data);
        }
        
        this.dashboard.updateTrip(this.trip.data);
      } catch (error) {
        console.error('Error al procesar datos GPS:', error);
      }
    });

    this.telemetry.onUpdate((data) => {
      try {
        this.dashboard.updateTelemetry(data);
      } catch (error) {
        console.error('Error al actualizar telemetría:', error);
      }
    });

    this.tachometer.onUpdate((rpm) => {
      try {
        // Si no hay OBD2, usamos audio FFT para la UI
        if (!this.obd2.isConnected) {
          this.dashboard.updateRpm(rpm);
        }
      } catch (error) {
        console.error('Error al actualizar tacómetro:', error);
      }
    });

    this.obd2.onUpdate((data) => {
      try {
        this.dashboard.updateRpm(data.rpm);
        // GPS Service emite speed en m/s, Dashboard asume que `data.speed` que le entra es m/s.
        // OBD2 emite km/h, por lo tanto dividimos por 3.6 para estandarizar.
        this.dashboard.updateGps({ speed: data.speed / 3.6, altitude: 0, accuracy: 0, heading: 0 });
      } catch (error) {
        console.error('Error al actualizar OBD2:', error);
      }
    });

    this.battery.onUpdate((level, charging) => {
      try {
        this.dashboard.updateBattery(level, charging);
      } catch (error) {
        console.error('Error al actualizar batería:', error);
      }
    });

    this.gps.onError((error) => {
      console.error('GPS error:', error.message);
      this.showGlobalStatus('No se pudo obtener la ubicación GPS. Revisa los permisos.', 'warning');
    });

    this.alert.onAlert((isAlerting) => {
      this.alertOverlay.classList.toggle('alert-active', isAlerting);
    });

    try {
      this.gps.start();
      this.telemetry.start();
    } catch (error) {
      console.error('Error al iniciar servicios base:', error);
      this.showGlobalStatus('No se pudieron iniciar algunos servicios del sistema.', 'warning');
    }
  }

  private applySettings(s: AppSettings): void {
    const safeSettings = sanitizeAppSettings(s);
    const langChanged = this.appSettings.language !== safeSettings.language;
    if (langChanged) {
      setLanguage(safeSettings.language);
      this.tripPanel.updateLanguage?.();
      this.history.updateLanguage?.();
      this.dashboard.updateLanguage?.();
      this.settings.updateLanguage?.();
      this.navbar.updateLanguage?.();
    }

    this.applyTheme(safeSettings.nightMode);

    this.tripPanel.setUnit(safeSettings.unit);
    this.history.setUnit(safeSettings.unit);
    this.dashboard.setUnit(safeSettings.unit);
    this.dashboard.setLayout?.(safeSettings.dashboardLayout);
    this.dashboard.setMaxRpm?.(safeSettings.maxRpm);

    this.alert.speedLimit = safeSettings.speedLimit;
    this.alert.enabled = safeSettings.speedAlertEnabled;
    this.alert.soundEnabled = safeSettings.soundEnabled;

    if (safeSettings.wakeLockEnabled) {
      this.wakeLock.acquire();
    } else {
      this.wakeLock.release();
    }

    this.appSettings = safeSettings;
  }

  private switchTab(tab: TabId): void {
    // Ocultar vista actual
    const views = this.contentEl.querySelectorAll('.view');
    views.forEach((v) => (v as HTMLElement).style.display = 'none');

    // Mostrar nueva vista
    const viewEl = document.getElementById(`view-${tab}`);
    if (viewEl) viewEl.style.display = '';


    this.navbar.setActiveTab(tab);

    // Refresh data si es necesario
    if (tab === 'history') this.refreshHistory();
  }

  private async refreshHistory(): Promise<void> {
    const trips = await this.storage.getTrips();
    this.history.update(trips);
  }

  private startUpdateLoop(): void {
    this.updateInterval = setInterval(() => {
      try {
        this.tripPanel.update(this.trip.data);
        this.dashboard.updateTrip(this.trip.data);
      } catch (error) {
        console.error('Error al refrescar el panel de viaje:', error);
      }
    }, 1000);
  }

  private saveSettings(s: AppSettings): void {
    const safeSettings = sanitizeAppSettings(s);
    this.applySettings(safeSettings);
    this.storage.saveSettings(safeSettings);
  }

  private applyTheme(nightMode: 'auto' | 'on' | 'off'): void {
    const body = document.body;
    let isLight = false;

    if (nightMode === 'off') {
      isLight = true;
    } else if (nightMode === 'auto') {
      const hour = new Date().getHours();
      // Light theme between 6 AM and 6 PM (18:00)
      isLight = hour >= 6 && hour < 18;
    }

    if (isLight) {
      body.classList.add('theme-light');
    } else {
      body.classList.remove('theme-light');
    }
  }

  private showGlobalStatus(message: string, type: 'warning' | 'error' = 'warning'): void {
    const existing = document.getElementById('global-status');
    if (existing) {
      existing.remove();
    }

    const status = document.createElement('div');
    status.id = 'global-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = message;
    status.style.cssText = `
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: calc(var(--navbar-height, 64px) + 16px);
      z-index: 200;
      padding: 12px 14px;
      border-radius: 12px;
      background: ${type === 'error' ? 'rgba(255, 61, 0, 0.95)' : 'rgba(255, 171, 0, 0.95)'};
      color: white;
      font-weight: 600;
      box-shadow: 0 10px 24px rgba(0,0,0,0.24);
    `;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 4000);
  }

  destroy(): void {
    this.gps.destroy();
    this.trip.destroy();
    this.wakeLock.destroy();
    this.alert.destroy();
    this.dashboard.destroy();
    this.telemetry.destroy();
    this.battery.destroy();
    this.obd2.destroy();
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}
