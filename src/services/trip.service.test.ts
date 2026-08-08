import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TripService } from './trip.service';

describe('TripService', () => {
  let tripService: TripService;

  beforeEach(() => {
    tripService = new TripService();
    vi.useFakeTimers();
  });

  it('should start in idle state', () => {
    expect(tripService.state).toBe('idle');
  });

  it('should transition to running state when started', () => {
    tripService.start();
    expect(tripService.state).toBe('running');
    expect(tripService.data.startTime).not.toBeNull();
  });

  it('should update max speed when new higher speed is processed', () => {
    tripService.start();
    
    tripService.processGpsData({
      latitude: -34.6037,
      longitude: -58.3816,
      speed: 15,
      accuracy: 10,
      altitude: 0,
      heading: 0,
      timestamp: Date.now()
    });

    expect(tripService.data.maxSpeed).toBe(15);

    tripService.processGpsData({
      latitude: -34.6037,
      longitude: -58.3816,
      speed: 25,
      accuracy: 10,
      altitude: 0,
      heading: 0,
      timestamp: Date.now()
    });

    expect(tripService.data.maxSpeed).toBe(25);
  });

  it('should pause and not process gps data', () => {
    tripService.start();
    tripService.pause();
    expect(tripService.state).toBe('paused');

    tripService.processGpsData({
      latitude: -34.6037,
      longitude: -58.3816,
      speed: 100, // Very high speed
      accuracy: 10,
      altitude: 0,
      heading: 0,
      timestamp: Date.now()
    });

    // Speed should still be 0 since it was paused
    expect(tripService.data.maxSpeed).toBe(0);
  });

  it('should reset properly', () => {
    tripService.start();
    tripService.processGpsData({
      latitude: 0, longitude: 0, speed: 20, accuracy: 5, altitude: 0, heading: 0, timestamp: Date.now()
    });
    
    tripService.reset();
    expect(tripService.state).toBe('idle');
    expect(tripService.data.maxSpeed).toBe(0);
    expect(tripService.data.startTime).toBeNull();
  });
});
