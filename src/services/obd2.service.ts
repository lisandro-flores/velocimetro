/// <reference types="web-bluetooth" />

export interface OBD2Data {
  rpm: number;
  speed: number;
}

export type OBD2Callback = (data: OBD2Data) => void;

export class OBD2Service {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private _isConnected = false;
  private interval: number | null = null;
  
  private currentRpm = 0;
  private currentSpeed = 0;

  private listeners: OBD2Callback[] = [];

  get isConnected(): boolean {
    return this._isConnected;
  }

  onUpdate(cb: OBD2Callback): void {
    this.listeners.push(cb);
  }

  async connect(): Promise<void> {
    if (this._isConnected) return;

    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth no soportado en este navegador.');
      }

      // UUID típico de SPP (Serial Port Profile) para adaptadores ELM327 BLE
      // Algunos adaptadores usan UUIDs diferentes. Aquí usamos un comodín general
      // y filtramos por nombre si es posible, o usamos UUID genérico de BLE a UART.
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] // Ejemplo común (HM-10 / JDY-08)
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) throw new Error('No se pudo conectar al GATT Server');

      const service = await this.server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');

      // Iniciar inicialización ELM327
      await this.sendCmd('ATZ\\r'); // Reset
      await new Promise(r => setTimeout(r, 1000));
      await this.sendCmd('ATE0\\r'); // Echo off
      await new Promise(r => setTimeout(r, 500));
      await this.sendCmd('ATL0\\r'); // Linefeeds off
      await new Promise(r => setTimeout(r, 500));
      
      // Iniciar notificaciones para recibir respuestas
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleResponse);

      this._isConnected = true;
      this.startPolling();

    } catch (err) {
      console.error('Error OBD2:', err);
      this.disconnect();
      throw err;
    }
  }

  private async sendCmd(cmd: string) {
    if (!this.characteristic) return;
    const encoder = new TextEncoder();
    await this.characteristic.writeValue(encoder.encode(cmd));
  }

  private handleResponse = (event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    const decoder = new TextDecoder('utf-8');
    const res = decoder.decode(char.value);
    
    // Parseo muy simplificado para PIDs 010C (RPM) y 010D (Speed)
    // ELM327 devuelve algo como '41 0C 1A F8' para RPM (1A F8 en hex = 6904 / 4 = 1726 RPM)
    // ELM327 devuelve algo como '41 0D 32' para Velocidad (32 en hex = 50 km/h)
    
    const lines = res.replace(/\\r/g, '').split('\\n');
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('41 0C')) {
        const parts = line.split(' ');
        if (parts.length >= 4) {
          const a = parseInt(parts[2], 16);
          const b = parseInt(parts[3], 16);
          this.currentRpm = ((a * 256) + b) / 4;
        }
      } else if (line.startsWith('41 0D')) {
        const parts = line.split(' ');
        if (parts.length >= 3) {
          this.currentSpeed = parseInt(parts[2], 16);
        }
      }
    }

    this.notify();
  };

  private startPolling() {
    let toggle = false;
    this.interval = window.setInterval(() => {
      if (!this._isConnected) return;
      // Intercalar peticiones (1Hz para velocidad, más para RPM en un escenario real, aquí simple toggle)
      if (toggle) {
        this.sendCmd('010C1\\r'); // RPM, 1 = wait 1 response
      } else {
        this.sendCmd('010D1\\r'); // Speed
      }
      toggle = !toggle;
    }, 200); // 5Hz polling total (2.5Hz cada sensor)
  }

  private notify() {
    this.listeners.forEach(cb => cb({
      rpm: this.currentRpm,
      speed: this.currentSpeed
    }));
  }

  private onDisconnected = () => {
    this.disconnect();
  };

  disconnect(): void {
    this._isConnected = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  destroy(): void {
    this.disconnect();
    this.listeners = [];
  }
}
