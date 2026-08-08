import { describe, it, expect } from 'vitest';
import { getSpeedUnitLabel, haversineDistance } from './format';

describe('Format Utils', () => {
  it('should return correct unit label', () => {
    expect(getSpeedUnitLabel('kmh')).toBe('km/h');
    expect(getSpeedUnitLabel('mph')).toBe('mph');
  });

  it('should calculate haversine distance correctly', () => {
    // Distancia de 1 grado de latitud a longitud 0 es aproximadamente 111.19 km
    const distLat = haversineDistance(0, 0, 1, 0);
    expect(distLat).toBeCloseTo(111.19, 1);
    
    // Misma posición debe dar 0
    const distZero = haversineDistance(-34.6037, -58.3816, -34.6037, -58.3816);
    expect(distZero).toBe(0);
  });
});
