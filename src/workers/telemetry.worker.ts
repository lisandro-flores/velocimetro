let currentLeanAngle = 0;
let maxLeanRight = 0;
let maxLeanLeft = 0;
let currentGForceY = 0;
let maxGForceAccel = 0;
let maxGForceBrake = 0;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'orientation') {
    const { angle } = payload;
    const alpha = 0.2;
    currentLeanAngle = (alpha * angle) + ((1 - alpha) * currentLeanAngle);

    if (currentLeanAngle > maxLeanRight) maxLeanRight = currentLeanAngle;
    if (currentLeanAngle < maxLeanLeft) maxLeanLeft = currentLeanAngle;

    self.postMessage({
      type: 'telemetry',
      payload: {
        leanAngle: currentLeanAngle,
        maxLeanRight,
        maxLeanLeft,
        gForceY: currentGForceY,
        maxGForceAccel,
        maxGForceBrake
      }
    });
  } else if (type === 'motion') {
    const { dt, rawG } = payload;
    let safeRawG = rawG;
    
    // Rechazo de picos físicos imposibles
    if (Math.abs(safeRawG - currentGForceY) > 2.0) {
      safeRawG = currentGForceY; 
    }

    const RC = 1 / (2 * Math.PI * 1.5); // 1.5 Hz cutoff
    const alpha = dt / (RC + dt);

    currentGForceY = currentGForceY + alpha * (safeRawG - currentGForceY);

    if (Math.abs(currentGForceY) < 0.03) {
      currentGForceY = 0;
    }

    if (currentGForceY > maxGForceAccel) maxGForceAccel = currentGForceY;
    if (currentGForceY < maxGForceBrake) maxGForceBrake = currentGForceY;

    self.postMessage({
      type: 'telemetry',
      payload: {
        leanAngle: currentLeanAngle,
        maxLeanRight,
        maxLeanLeft,
        gForceY: currentGForceY,
        maxGForceAccel,
        maxGForceBrake
      }
    });
  } else if (type === 'reset') {
    maxLeanRight = 0;
    maxLeanLeft = 0;
    maxGForceAccel = 0;
    maxGForceBrake = 0;
  }
};
