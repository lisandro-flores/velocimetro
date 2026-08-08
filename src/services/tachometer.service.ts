export type TachometerCallback = (rpm: number) => void;

export class TachometerService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private _isActive = false;
  
  private listeners: TachometerCallback[] = [];
  private updateFrame: number | null = null;
  private buf = new Float32Array(2048);
  
  // Smoothing
  private smoothedRpm = 0;

  get isActive(): boolean {
    return this._isActive;
  }

  onUpdate(cb: TachometerCallback): void {
    this.listeners.push(cb);
  }

  async start(): Promise<void> {
    if (this._isActive) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyser);
      
      this._isActive = true;
      this.loop();
    } catch (err) {
      console.error('Error starting tachometer:', err);
      throw err;
    }
  }

  stop(): void {
    if (!this._isActive) return;
    this._isActive = false;
    
    if (this.updateFrame !== null) {
      cancelAnimationFrame(this.updateFrame);
      this.updateFrame = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }

  private loop = (): void => {
    if (!this._isActive || !this.analyser || !this.audioContext) return;

    this.analyser.getFloatTimeDomainData(this.buf);
    const hz = this.autoCorrelate(this.buf, this.audioContext.sampleRate);
    
    if (hz !== -1) {
      // Leer el número de cilindros desde localStorage (AppSettings)
      let cylinders = 1;
      try {
        const stored = localStorage.getItem('motospeed_settings');
        if (stored) {
          const s = JSON.parse(stored);
          if (s.engineCylinders) cylinders = s.engineCylinders;
        }
      } catch (e) {}

      // Multiplicador:
      // 4 tiempos 1 cil = 1 explosión cada 2 vueltas -> 1Hz = 60 exp/min = 120 RPM
      // 2 cil = 1 explosión cada 1 vuelta -> 1Hz = 60 RPM
      // 3 cil = 1 explosión cada 0.66 vueltas -> 1Hz = 40 RPM
      // 4 cil = 1 explosión cada 0.5 vueltas -> 1Hz = 30 RPM
      const multiplier = 120 / cylinders;
      
      const targetRpm = hz * multiplier;
      
      // Filtrar lecturas ridículas (ej. > 16000 RPM)
      if (targetRpm > 500 && targetRpm < 16000) {
        // Suavizado (Low Pass Filter)
        this.smoothedRpm = this.smoothedRpm + (targetRpm - this.smoothedRpm) * 0.1;
        this.listeners.forEach(cb => cb(this.smoothedRpm));
      }
    } else {
      // Si no hay señal, caer lentamente a 0
      this.smoothedRpm = this.smoothedRpm * 0.95;
      if (this.smoothedRpm < 100) this.smoothedRpm = 0;
      this.listeners.forEach(cb => cb(this.smoothedRpm));
    }

    this.updateFrame = requestAnimationFrame(this.loop);
  };

  private autoCorrelate(buf: Float32Array, sampleRate: number): number {
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // Not enough signal

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    buf = buf.subarray(r1, r2);
    SIZE = buf.length;

    const c = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }
}
