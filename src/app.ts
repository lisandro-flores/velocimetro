import { GpsService } from './services/gps.service';
import { TripService } from './services/trip.service';
import { StorageService } from './services/storage.service';
import { WakeLockService } from './services/wakelock.service';
import { AlertService } from './services/alert.service';
import { TelemetryService } from './services/telemetry.service';
import { BatteryService } from './services/battery.service';

import { TripPanelComponent } from './components/trip-panel';
import { HistoryComponent } from './components/history';
import { SettingsComponent } from './components/settings';
import { NavbarComponent } from './components/navbar';
import { DashboardComponent } from './components/dashboard';

import type { TabId, AppSettings } from './utils/constants';
import { setLanguage } from './utils/i18n';

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
    this.appSettings = this.storage.getSettings();
    this.contentEl = document.getElementById('app-content')!;
    this.navbarEl = document.getElementById('app-navbar')!;
    this.alertOverlay = document.getElementById('alert-overlay')!;
  }

  /** Iniciar la app */
  async init(): Promise<void> {
    // Set initial language
    setLanguage(this.appSettings.language || 'es');
    this.applyTheme(this.appSettings.nightMode);

    // Escuchar invitación de instalación PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.settings) {
        this.settings.setInstallAvailable(true);
      }
    });

    // Crear containers para cada vista
    this.createViewContainers();

    // Inicializar componentes
    this.initComponents();

    // Inicializar servicios
    this.initServices();

    // Aplicar settings
    this.applySettings(this.appSettings);

    // Mostrar tab inicial
    this.switchTab('dashboard');

    // Update loop para trip panel
    this.startUpdateLoop();
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
    // Dashboard
    this.dashboard = new DashboardComponent(
      this.contentEl.querySelector('#view-dashboard') as HTMLElement
    );
    this.dashboard.onCalibrate = () => {
      this.telemetry.calibrate();
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
    // GPS callbacks
    this.gps.onUpdate((data) => {
      this.trip.processGpsData(data);
      this.alert.checkSpeed(data.speed);
      this.dashboard.updateGps(data);
    });

    this.telemetry.onUpdate((data) => {
      this.dashboard.updateTelemetry(data);
    });

    this.battery.onUpdate((level, charging) => {
      this.dashboard.updateBattery(level, charging);
    });

    this.gps.onError((error) => {
      console.error('GPS error:', error.message);
    });

    // Alert visual
    this.alert.onAlert((isAlerting) => {
      this.alertOverlay.classList.toggle('alert-active', isAlerting);
    });

    // Iniciar GPS y telemetría
    this.gps.start();
    this.telemetry.start();
  }

  private applySettings(s: AppSettings): void {
    // Check if language changed
    const langChanged = this.appSettings.language !== s.language;
    if (langChanged) {
      setLanguage(s.language);
      this.tripPanel.updateLanguage?.();
      this.history.updateLanguage?.();
      this.dashboard.updateLanguage?.();
      this.settings.updateLanguage?.();
      this.navbar.updateLanguage?.();
    }

    // Aplicar Tema
    this.applyTheme(s.nightMode);

    // Unidad
    this.tripPanel.setUnit(s.unit);
    this.history.setUnit(s.unit);
    this.dashboard.setUnit(s.unit);

    // Alert
    this.alert.speedLimit = s.speedLimit;
    this.alert.enabled = s.speedAlertEnabled;
    this.alert.soundEnabled = s.soundEnabled;

    // Wake Lock
    if (s.wakeLockEnabled) {
      this.wakeLock.acquire();
    } else {
      this.wakeLock.release();
    }
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
      // Actualizar trip panel continuamente
      this.tripPanel.update(this.trip.data);
      this.dashboard.updateTrip(this.trip.data);
    }, 1000);
  }

  private saveSettings(s: AppSettings): void {
    this.applySettings(s);
    this.appSettings = { ...s };
    this.storage.saveSettings(this.appSettings);
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

  destroy(): void {
    this.gps.destroy();
    this.trip.destroy();
    this.wakeLock.destroy();
    this.alert.destroy();
    this.dashboard.destroy();
    this.telemetry.destroy();
    this.battery.destroy();
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}
