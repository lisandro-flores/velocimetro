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
  
  private worker: Worker | null = null;

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
      
      const biquadFilter = this.audioContext.createBiquadFilter();
      biquadFilter.type = 'bandpass';
      biquadFilter.frequency.value = 120;
      biquadFilter.Q.value = 1.0; 
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.source.connect(biquadFilter);
      biquadFilter.connect(this.analyser);
      
      this.worker = new Worker(new URL('../workers/tachometer.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent) => {
        if (e.data.rpm !== undefined) {
          this.listeners.forEach(cb => cb(e.data.rpm));
        }
      };

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
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }

  private loop = (): void => {
    if (!this._isActive || !this.analyser || !this.audioContext || !this.worker) return;

    this.analyser.getFloatTimeDomainData(this.buf);
    
    let cylinders = 1;
    try {
      const stored = localStorage.getItem('motospeed_settings');
      if (stored) {
        const s = JSON.parse(stored);
        if (s.engineCylinders) cylinders = s.engineCylinders;
      }
    } catch (e) {}

    // Enviar buffer al worker, sin transferir para evitar perder referencia (buf es reutilizable)
    this.worker.postMessage({
      buf: this.buf,
      sampleRate: this.audioContext.sampleRate,
      cylinders
    });

    this.updateFrame = requestAnimationFrame(this.loop);
  };
}
