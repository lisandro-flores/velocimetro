import { headingToCardinal } from '../utils/format';

/**
 * Componente de brújula digital con rosa de los vientos SVG.
 */
export class CompassComponent {
  private container: HTMLElement;
  private currentHeading = 0;
  private targetHeading = 0;
  private animationId: number | null = null;

  // DOM
  private roseEl!: SVGGElement;
  private degreesEl!: HTMLElement;
  private cardinalEl!: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.startAnimation();
  }

  /** Actualizar heading */
  setHeading(deg: number): void {
    this.targetHeading = deg;
  }

  destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="compass-view" id="compass-view">
        <h2 class="section-title">
          <span class="section-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg></span>
          Brújula
        </h2>

        <div class="compass-wrapper">
          <svg viewBox="0 0 300 300" class="compass-svg">
            <defs>
              <filter id="compass-glow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- Anillo exterior -->
            <circle cx="150" cy="150" r="135" class="compass-ring-outer" />
            <circle cx="150" cy="150" r="130" class="compass-ring-inner" />

            <!-- Rosa de los vientos (rota) -->
            <g id="compass-rose" transform="rotate(0, 150, 150)">
              <!-- Ticks de grados -->
              ${this.generateTicks()}

              <!-- Direcciones cardinales -->
              <text x="150" y="40" class="compass-cardinal compass-north">N</text>
              <text x="260" y="155" class="compass-cardinal">E</text>
              <text x="150" y="272" class="compass-cardinal">S</text>
              <text x="40" y="155" class="compass-cardinal">O</text>

              <!-- Direcciones intermedias -->
              <text x="227" y="73" class="compass-intercardinal">NE</text>
              <text x="227" y="237" class="compass-intercardinal">SE</text>
              <text x="73" y="237" class="compass-intercardinal">SO</text>
              <text x="73" y="73" class="compass-intercardinal">NO</text>
            </g>

            <!-- Indicador fijo (triángulo arriba) -->
            <polygon points="150,18 143,32 157,32" class="compass-indicator" />

            <!-- Centro -->
            <circle cx="150" cy="150" r="6" class="compass-center" />
          </svg>
        </div>

        <div class="compass-info">
          <div class="compass-degrees" id="compass-degrees">0°</div>
          <div class="compass-cardinal-display" id="compass-cardinal">N</div>
        </div>
      </div>
    `;

    this.roseEl = this.container.querySelector('#compass-rose') as SVGGElement;
    this.degreesEl = this.container.querySelector('#compass-degrees') as HTMLElement;
    this.cardinalEl = this.container.querySelector('#compass-cardinal') as HTMLElement;
  }

  private generateTicks(): string {
    const ticks: string[] = [];
    const cx = 150, cy = 150, r = 128;

    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 30 === 0;
      const isMinor10 = deg % 10 === 0;
      const innerR = isMajor ? r - 18 : (isMinor10 ? r - 12 : r - 7);

      const x1 = cx + innerR * Math.cos(rad - Math.PI / 2);
      const y1 = cy + innerR * Math.sin(rad - Math.PI / 2);
      const x2 = cx + r * Math.cos(rad - Math.PI / 2);
      const y2 = cy + r * Math.sin(rad - Math.PI / 2);

      const cls = isMajor ? 'compass-tick-major' : 'compass-tick-minor';
      ticks.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" />`);
    }

    return ticks.join('');
  }

  private startAnimation(): void {
    const animate = () => {
      // Interpolar heading con shortest path
      let diff = this.targetHeading - this.currentHeading;
      // Normalizar a -180..180
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;

      this.currentHeading += diff * 0.1;
      // Normalizar a 0..360
      this.currentHeading = ((this.currentHeading % 360) + 360) % 360;

      this.updateDisplay();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private updateDisplay(): void {
    // La rosa rota en sentido inverso al heading (el indicador apunta al norte)
    const rotation = -this.currentHeading;
    this.roseEl.setAttribute('transform', `rotate(${rotation}, 150, 150)`);

    this.degreesEl.textContent = `${Math.round(this.currentHeading)}°`;
    this.cardinalEl.textContent = headingToCardinal(this.currentHeading);
  }
}
