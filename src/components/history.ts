import type { TripSummary } from '../services/trip.service';
import { formatDate, formatDistance, formatTime, formatSpeed } from '../utils/format';
import { t } from '../utils/i18n';

/**
 * Componente de historial de viajes.
 * Muestra una lista de viajes guardados con cards.
 */
export class HistoryComponent {
  private container: HTMLElement;
  private trips: TripSummary[] = [];
  private unit: 'kmh' | 'mph' = 'kmh';

  public onDelete: ((id: string) => void) | null = null;
  public onClear: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
  }

  /** Actualizar lista de viajes y re-renderizar */
  update(trips: TripSummary[]): void {
    this.trips = trips;
    this.render();
  }

  destroy(): void {
    // Cleanup handled by parent
  }

  /** Re-renderizar si cambia el idioma */
  updateLanguage(): void {
    this.render();
  }

  private render(): void {
    const tripCards = this.trips.length > 0
      ? this.trips.map((trip, index) => this.renderTripCard(trip, index)).join('')
      : `<div class="history-empty"><span class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a3.5 3.5 0 1 0-7 0"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></span><p>${t('history.empty')}</p><p class="empty-hint">${t('history.emptyHint')}</p></div>`;

    this.container.innerHTML = `
      <div class="history-view" id="history-view">
        <div class="history-header">
          <h2 class="section-title">
            <span class="section-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>
            ${t('history.title')}
          </h2>
          ${this.trips.length > 0 ? `
            <button class="btn btn-ghost btn-sm" id="history-clear-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> ${t('history.clear')}</button>
          ` : ''}
        </div>

        <div class="history-count">${t('history.count', this.trips.length.toString())}</div>

        <div class="history-list">
          ${tripCards}
        </div>
      </div>
    `;

    // Event listeners
    const clearBtn = this.container.querySelector('#history-clear-btn');
    clearBtn?.addEventListener('click', () => {
      if (confirm(t('history.deleteConfirm'))) {
        this.onClear?.();
      }
    });

    this.container.querySelectorAll('.history-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (!id) return;
        if (window.confirm(t('history.deleteConfirmItem'))) {
          this.onDelete?.(id);
        }
      });
    });
  }

  private renderTripCard(trip: TripSummary, index: number): string {
    return `
      <div class="history-card" style="animation: slideIn 0.4s var(--ease-out) ${index * 0.05}s both;">
        <div class="history-card-header">
          <span class="history-date">${formatDate(trip.date)}</span>
          <button class="btn-icon history-delete-btn" data-id="${trip.id}" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="history-card-stats">
          <div class="history-stat">
            <span class="history-stat-value">${formatDistance(trip.distance, this.unit)}</span>
            <span class="history-stat-label">${t('trip.distance')}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value">${formatTime(trip.duration)}</span>
            <span class="history-stat-label">${t('trip.time')}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value">${formatSpeed(trip.maxSpeed, this.unit)}</span>
            <span class="history-stat-label">${t('trip.maxSpeed')}</span>
          </div>
          <div class="history-stat">
            <span class="history-stat-value">${formatSpeed(trip.avgSpeed, this.unit)}</span>
            <span class="history-stat-label">${t('trip.avgSpeed')}</span>
          </div>
        </div>
      </div>
    `;
  }
}
