let smoothedRpm = 0;

self.onmessage = (e: MessageEvent) => {
  const { buf, sampleRate, cylinders } = e.data;
  
  if (!buf) return;

  const hz = autoCorrelate(buf, sampleRate);

  if (hz !== -1) {
    const multiplier = 120 / cylinders;
    const targetRpm = hz * multiplier;
    
    if (targetRpm > 500 && targetRpm < 16000) {
      smoothedRpm = smoothedRpm + (targetRpm - smoothedRpm) * 0.1;
    }
  } else {
    smoothedRpm = smoothedRpm * 0.95;
    if (smoothedRpm < 100) smoothedRpm = 0;
  }

  self.postMessage({ rpm: smoothedRpm });
};

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
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
