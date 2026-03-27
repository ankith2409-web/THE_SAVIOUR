import { Location } from '../types';

/**
 * AMBULANCE LIVE GPS TRACKER
 * Tracks the driver's location and reports it back via a callback.
 * Used by the Hospital Portal after dispatching an ambulance.
 */
export class LocationTracker {
  private static watchId: number | null = null;
  private static intervalId: number | null = null;
  private static currentLocation: Location | null = null;
  private static isTracking = false;

  /**
   * Start tracking the driver's GPS position.
   * Fires the callback every 5 seconds with the latest location.
   */
  static startTracking(
    onLocationUpdate: (location: Location) => void,
    intervalMs: number = 5000
  ): void {
    if (this.isTracking) return;
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation not available for tracking');
      return;
    }

    this.isTracking = true;

    // Watch position continuously
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      },
      (err) => console.warn('GPS tracking error:', err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    // Report location at set intervals
    this.intervalId = window.setInterval(() => {
      if (this.currentLocation) {
        onLocationUpdate(this.currentLocation);
      }
    }, intervalMs);
  }

  /**
   * Stop tracking.
   */
  static stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isTracking = false;
    this.currentLocation = null;
  }

  /**
   * Get current tracking status.
   */
  static getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get the last known location.
   */
  static getLastLocation(): Location | null {
    return this.currentLocation;
  }
}
