import { useCallback, useEffect, useState } from 'react';
import { UserLocation } from '../types/station';

const LOCATION_STORAGE_KEY = 'orbitaltrack_user_location_v1';

// Default location: Rome, Italy (if GPS permission is not yet granted)
const DEFAULT_LOCATION: UserLocation = {
  lat: 41.9028,
  lon: 12.4964,
  altitudeMeters: 50,
  label: 'Roma, IT (Default)',
  source: 'default',
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as UserLocation;
      }
    } catch {
      // ignore
    }
    return DEFAULT_LOCATION;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestGpsLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocalizzazione non supportata dal browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLoc: UserLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitudeMeters: pos.coords.altitude || 50,
          label: 'Posizione GPS Attuale',
          source: 'gps',
        };
        setLocation(nextLoc);
        setIsLocating(false);
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(nextLoc));
        } catch {
          // ignore
        }
      },
      (err) => {
        setIsLocating(false);
        setError(err.message || 'Impossibile ottenere la posizione GPS.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lon: number, label = 'Posizione Manuale') => {
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const clampedLon = Math.max(-180, Math.min(180, lon));
    const nextLoc: UserLocation = {
      lat: clampedLat,
      lon: clampedLon,
      altitudeMeters: 50,
      label,
      source: 'manual',
    };
    setLocation(nextLoc);
    setError(null);
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(nextLoc));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (location.source === 'default' && 'geolocation' in navigator) {
      requestGpsLocation();
    }
  }, [location.source, requestGpsLocation]);

  return {
    location,
    isLocating,
    error,
    requestGpsLocation,
    setManualLocation,
  };
}
