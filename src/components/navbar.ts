import { NAV_TABS } from '../utils/constants';
import type { TabId } from '../utils/constants';

/**
 * Barra de navegación inferior con tabs.
 */
export class NavbarComponent {
  private container: HTMLElement;
  private activeTab: TabId = 'speed';

  public onTabChange: ((tab: TabId) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /** Marcar tab activo */
  setActiveTab(tab: TabId): void {
    this.activeTab = tab;
    this.updateActive();
  }

  destroy(): void {
    // Cleanup handled by parent
  }

  private render(): void {
    const tabs = NAV_TABS.map((tab) => `
      <button class="nav-tab ${tab.id === this.activeTab ? 'nav-tab-active' : ''}"
        data-tab="${tab.id}" id="nav-tab-${tab.id}">
        <span class="nav-tab-icon">${tab.icon}</span>
        <span class="nav-tab-label">${tab.label}</span>
      </button>
    `).join('');

    this.container.innerHTML = `
      <nav class="navbar" id="main-navbar">
        ${tabs}
      </nav>
    `;

    // Events
    this.container.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as TabId;
        this.activeTab = tab;
        this.updateActive();
        this.onTabChange?.(tab);
      });
    });
  }

  private updateActive(): void {
    this.container.querySelectorAll('.nav-tab').forEach((btn) => {
      const tab = (btn as HTMLElement).dataset.tab;
      btn.classList.toggle('nav-tab-active', tab === this.activeTab);
    });
  }
}
