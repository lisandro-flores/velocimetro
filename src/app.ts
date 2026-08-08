import { GpsService } from './services/gps.service';
import { CompassService } from './services/compass.service';
import { TripService } from './services/trip.service';
import { StorageService } from './services/storage.service';
import { WakeLockService } from './services/wakelock.service';
import { AlertService } from './services/alert.service';
import { TelemetryService } from './services/telemetry.service';
import { BatteryService } from './services/battery.service';

import { SpeedometerComponent } from './components/speedometer';
import { TripPanelComponent } from './components/trip-panel';
import { CompassComponent } from './components/compass';
import { HistoryComponent } from './components/history';
import { SettingsComponent } from './components/settings';
import { NavbarComponent } from './components/navbar';
import { DashboardComponent } from './components/dashboard';

import type { TabId, AppSettings } from './utils/constants';

/**
 * Controlador principal de MotoSpeed.
 * Orquesta servicios y componentes, maneja el routing por tabs.
 */
export class App {
  // Servicios
  private gps = new GpsService();
  private compassService = new CompassService();
  private trip = new TripService();
  private storage = new StorageService();
  private wakeLock = new WakeLockService();
  private alert = new AlertService();
  private telemetry = new TelemetryService();
  private battery = new BatteryService();

  // Componentes
  private speedometer!: SpeedometerComponent;
  private tripPanel!: TripPanelComponent;
  private compass!: CompassComponent;
  private history!: HistoryComponent;
  private settings!: SettingsComponent;
  private navbar!: NavbarComponent;
  private dashboard!: DashboardComponent;

  // Estado

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
    // Crear containers para cada vista
    this.createViewContainers();

    // Inicializar componentes
    this.initComponents();

    // Inicializar servicios
    this.initServices();

    // Aplicar settings
    this.applySettings(this.appSettings);

    // Mostrar tab inicial
    this.switchTab('speed');

    // Update loop para trip panel
    this.startUpdateLoop();
  }

  private createViewContainers(): void {
    this.contentEl.innerHTML = `
      <div class="view" id="view-speed"></div>
      <div class="view" id="view-dashboard" style="display:none"></div>
      <div class="view" id="view-trip" style="display:none"></div>
      <div class="view" id="view-compass" style="display:none"></div>
      <div class="view" id="view-history" style="display:none"></div>
      <div class="view" id="view-settings" style="display:none"></div>
    `;
  }

  private initComponents(): void {
    // Speedometer
    this.speedometer = new SpeedometerComponent(
      document.getElementById('view-speed')!
    );

    // Dashboard
    this.dashboard = new DashboardComponent(
      document.getElementById('view-dashboard')!
    );

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
      this.speedometer.resetMax();
    };
    this.tripPanel.onSave = async () => {
      const summary = this.trip.getSummary();
      if (summary.distance > 0 || summary.duration > 10) {
        await this.storage.saveTrip(summary);
        this.trip.reset();
        this.speedometer.resetMax();
        this.refreshHistory();
      }
    };

    // Compass
    this.compass = new CompassComponent(
      document.getElementById('view-compass')!
    );

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
    this.settings.onChange = (newSettings) => {
      this.appSettings = newSettings;
      this.storage.saveSettings(newSettings);
      this.applySettings(newSettings);
    };

    // Navbar
    this.navbar = new NavbarComponent(this.navbarEl);
    this.navbar.onTabChange = (tab) => this.switchTab(tab);
  }

  private initServices(): void {
    // GPS callbacks
    this.gps.onUpdate((data) => {
      this.speedometer.setSpeed(data.speed);
      this.speedometer.setHeading(data.heading);
      this.trip.processGpsData(data);
      this.alert.checkSpeed(data.speed);

      // Actualizar brújula con heading GPS si no hay sensor
      if (data.heading !== null) {
        this.compassService.updateFromGps(data.heading);
        this.compass.setHeading(data.heading);
      }
    });

    this.telemetry.onUpdate((data) => {
      this.dashboard.updateTelemetry(data);
    });

    this.battery.onUpdate((level, charging) => {
      this.dashboard.updateBattery(level, charging);
    });

    this.gps.onError((error) => {
      console.error('GPS error:', error.message);
      // Podríamos mostrar un toast, pero por ahora log
    });

    // Compass service
    this.compassService.onUpdate((heading) => {
      this.compass.setHeading(heading);
      this.speedometer.setHeading(heading);
    });

    // Alert visual
    this.alert.onAlert((isAlerting) => {
      this.alertOverlay.classList.toggle('alert-active', isAlerting);
    });

    // Iniciar GPS y brújula
    this.gps.start();
    this.compassService.start();
    this.telemetry.start();
  }

  private applySettings(s: AppSettings): void {
    // Unidad
    this.speedometer.setUnit(s.unit);
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
    }, 1000);
  }

  destroy(): void {
    this.gps.destroy();
    this.compassService.destroy();
    this.trip.destroy();
    this.wakeLock.destroy();
    this.alert.destroy();
    this.speedometer.destroy();
    this.compass.destroy();
    this.dashboard.destroy();
    this.telemetry.destroy();
    this.battery.destroy();
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}
