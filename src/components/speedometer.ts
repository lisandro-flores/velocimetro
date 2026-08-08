import { formatSpeed, getSpeedUnitLabel, formatClock, headingToCardinal } from '../utils/format';
import { MAX_GAUGE_SPEED } from '../utils/constants';

/**
 * Componente de velocímetro con gauge SVG animado.
 * Incluye aguja animada, display digital, velocidad máxima, dirección y reloj.
 */
export class SpeedometerComponent {
  private container: HTMLElement;
  private currentSpeed = 0;
  private targetSpeed = 0;
  private maxSpeed = 0;
  private heading: number | null = null;
  private unit: 'kmh' | 'mph' = 'kmh';
  private animationId: number | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  // DOM elements
  private needleEl!: SVGLineElement;
  private speedTextEl!: HTMLElement;
  private unitEl!: HTMLElement;
  private maxSpeedEl!: HTMLElement;
  private headingEl!: HTMLElement;
  private clockEl!: HTMLElement;
  private gaugeArcEl!: SVGPathElement;


  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.startAnimation();
    this.startClock();
  }

  /** Actualizar velocidad actual */
  setSpeed(kmh: number): void {
    this.targetSpeed = Math.max(0, kmh);
    if (kmh > this.maxSpeed) {
      this.maxSpeed = kmh;
    }
  }

  /** Actualizar heading/dirección */
  setHeading(deg: number | null): void {
    this.heading = deg;
  }

  /** Actualizar unidad de velocidad */
  setUnit(unit: 'kmh' | 'mph'): void {
    this.unit = unit;
    if (this.unitEl) {
      this.unitEl.textContent = getSpeedUnitLabel(unit);
    }
  }

  /** Resetear velocidad máxima */
  resetMax(): void {
    this.maxSpeed = 0;
  }

  destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  private render(): void {
    const cx = 150, cy = 150, r = 120;
    // Arco de 240° (de 150° a 390°/30°)
    const startAngle = 150;
    const endAngle = 390;
    const totalAngle = endAngle - startAngle;

    // Generar ticks mayores y menores
    const majorTicks: string[] = [];
    const minorTicks: string[] = [];
    const labels: string[] = [];
    const maxVal = MAX_GAUGE_SPEED;
    const majorStep = 20;
    const minorStep = 10;

    for (let v = 0; v <= maxVal; v += minorStep) {
      const angle = startAngle + (v / maxVal) * totalAngle;
      const rad = (angle * Math.PI) / 180;
      const isMajor = v % majorStep === 0;

      const innerR = isMajor ? r - 20 : r - 12;
      const x1 = cx + innerR * Math.cos(rad);
      const y1 = cy + innerR * Math.sin(rad);
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy + r * Math.sin(rad);

      const tickClass = isMajor ? 'gauge-tick-major' : 'gauge-tick-minor';
      const tick = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${tickClass}" />`;

      if (isMajor) {
        majorTicks.push(tick);
        const labelR = r - 32;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        labels.push(`<text x="${lx}" y="${ly}" class="gauge-label" data-value="${v}">${v}</text>`);
      } else {
        minorTicks.push(tick);
      }
    }

    // Color arc (gradiente de verde a rojo)
    const arcSegments = this.generateColorArc(cx, cy, r - 5, startAngle, endAngle);

    this.container.innerHTML = `
      <div class="speedometer" id="speedometer-view">
        <div class="speedo-clock" id="speedo-clock">${formatClock()}</div>
        <div class="speedo-heading" id="speedo-heading">--</div>
        <div class="speedo-gauge-wrapper">
          <svg viewBox="0 0 300 300" class="speedo-gauge">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="needle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ff6d00"/>
                <stop offset="100%" style="stop-color:#ff3d00"/>
              </linearGradient>
            </defs>

            <!-- Arco de colores -->
            ${arcSegments}

            <!-- Ticks -->
            ${minorTicks.join('')}
            ${majorTicks.join('')}

            <!-- Labels -->
            ${labels.join('')}

            <!-- Arco de progreso activo -->
            <path id="gauge-arc-active" class="gauge-arc-active" d="" fill="none" stroke="url(#activeArcGrad)" stroke-width="4" filter="url(#glow)" />
            <defs>
              <linearGradient id="activeArcGrad">
                <stop offset="0%" style="stop-color:#00e5ff"/>
                <stop offset="100%" style="stop-color:#ff6d00"/>
              </linearGradient>
            </defs>

            <!-- Centro -->
            <circle cx="${cx}" cy="${cy}" r="8" class="gauge-center" />
            <circle cx="${cx}" cy="${cy}" r="4" class="gauge-center-dot" />

            <!-- Aguja -->
            <line id="speedo-needle" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r + 25}" class="gauge-needle" />
          </svg>
        </div>

        <div class="speedo-digital">
          <span class="speedo-speed-value" id="speedo-speed">0</span>
          <span class="speedo-speed-unit" id="speedo-unit">${getSpeedUnitLabel(this.unit)}</span>
        </div>

        <div class="speedo-stats">
          <div class="speedo-stat">
            <span class="speedo-stat-label">VEL. MÁX</span>
            <span class="speedo-stat-value" id="speedo-max">0</span>
          </div>
        </div>
      </div>
    `;

    // Cache DOM elements
    this.needleEl = this.container.querySelector('#speedo-needle') as SVGLineElement;
    this.speedTextEl = this.container.querySelector('#speedo-speed') as HTMLElement;
    this.unitEl = this.container.querySelector('#speedo-unit') as HTMLElement;
    this.maxSpeedEl = this.container.querySelector('#speedo-max') as HTMLElement;
    this.headingEl = this.container.querySelector('#speedo-heading') as HTMLElement;
    this.clockEl = this.container.querySelector('#speedo-clock') as HTMLElement;
    this.gaugeArcEl = this.container.querySelector('#gauge-arc-active') as SVGPathElement;

  }

  private generateColorArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const segments: string[] = [];
    const totalAngle = endAngle - startAngle;
    const numSegments = 60;
    const segmentAngle = totalAngle / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const a1 = startAngle + i * segmentAngle;
      const a2 = a1 + segmentAngle + 0.5; // small overlap
      const rad1 = (a1 * Math.PI) / 180;
      const rad2 = (a2 * Math.PI) / 180;

      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);

      // Gradiente: verde → amarillo → naranja → rojo
      const t = i / numSegments;
      const color = this.getArcColor(t);

      segments.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" opacity="0.15"/>`
      );
    }

    return segments.join('');
  }

  private getArcColor(t: number): string {
    if (t < 0.4) return '#00e5ff';
    if (t < 0.6) return '#76ff03';
    if (t < 0.8) return '#ffab00';
    return '#ff3d00';
  }

  private startAnimation(): void {
    const animate = () => {
      // Suavizar movimiento de la aguja
      const diff = this.targetSpeed - this.currentSpeed;
      this.currentSpeed += diff * 0.12;

      // Evitar vibración innecesaria
      if (Math.abs(diff) < 0.1) {
        this.currentSpeed = this.targetSpeed;
      }

      this.updateNeedle();
      this.updateDisplay();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private updateNeedle(): void {
    const cx = 150, cy = 150, r = 120;
    const startAngle = 150;
    const totalAngle = 240;

    const speedRatio = Math.min(this.currentSpeed / MAX_GAUGE_SPEED, 1);
    const angle = startAngle + speedRatio * totalAngle;
    const rad = (angle * Math.PI) / 180;

    const needleLength = r - 20;
    const x2 = cx + needleLength * Math.cos(rad);
    const y2 = cy + needleLength * Math.sin(rad);

    this.needleEl.setAttribute('x2', x2.toString());
    this.needleEl.setAttribute('y2', y2.toString());

    // Actualizar arco activo
    this.updateActiveArc(cx, cy, r - 5, startAngle, angle);
  }

  private updateActiveArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): void {
    if (endAngle <= startAngle) {
      this.gaugeArcEl.setAttribute('d', '');
      return;
    }
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    this.gaugeArcEl.setAttribute('d', d);
  }

  private updateDisplay(): void {
    const displaySpeed = formatSpeed(this.currentSpeed, this.unit);
    this.speedTextEl.textContent = displaySpeed;
    this.maxSpeedEl.textContent = formatSpeed(this.maxSpeed, this.unit);

    if (this.heading !== null) {
      const cardinal = headingToCardinal(this.heading);
      this.headingEl.textContent = `${cardinal} ${Math.round(this.heading)}°`;
    }

    // Color dinámico del valor digital según velocidad
    const ratio = this.currentSpeed / MAX_GAUGE_SPEED;
    if (ratio > 0.8) {
      this.speedTextEl.style.color = '#ff3d00';
    } else if (ratio > 0.6) {
      this.speedTextEl.style.color = '#ffab00';
    } else {
      this.speedTextEl.style.color = 'var(--accent-cyan)';
    }
  }

  private startClock(): void {
    this.clockInterval = setInterval(() => {
      if (this.clockEl) {
        this.clockEl.textContent = formatClock();
      }
    }, 10000);
  }
}
