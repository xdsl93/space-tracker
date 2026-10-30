import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TLES } from '../data/defaultTles';
import { computeStationTelemetry, predictUpcomingPasses } from '../services/orbitalEngine';
import { getSpaceStationTles } from '../services/tleService';
import {
  SatellitePass,
  StationId,
  StationTelemetry,
  TleData,
  UserLocation,
} from '../types/station';

export function useSpaceStations(userLocation: UserLocation) {
  const [tles, setTles] = useState<Record<StationId, TleData>>(DEFAULT_TLES);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isRefreshingTle, setIsRefreshingTle] = useState(false);

  const refreshTles = useCallback(async (force = false) => {
    setIsRefreshingTle(true);
    try {
      const updated = await getSpaceStationTles(force);
      setTles(updated);
    } finally {
      setIsRefreshingTle(false);
    }
  }, []);

  useEffect(() => {
    refreshTles(false);
  }, [refreshTles]);

  // Real-time 1 second tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const stations = useMemo<Record<StationId, StationTelemetry>>(() => {
    const issTelemetry =
      computeStationTelemetry(tles.iss, userLocation, now) ||
      computeStationTelemetry(DEFAULT_TLES.iss, userLocation, now)!;

    const tiangongTelemetry =
      computeStationTelemetry(tles.tiangong, userLocation, now) ||
      computeStationTelemetry(DEFAULT_TLES.tiangong, userLocation, now)!;

    return {
      iss: issTelemetry,
      tiangong: tiangongTelemetry,
    };
  }, [tles, userLocation, now]);

  // Recompute pass predictions every minute or when userLocation / TLEs change
  const passMinuteKey = Math.floor(now.getTime() / 60000);
  const upcomingPasses = useMemo<SatellitePass[]>(() => {
    const refDate = new Date(passMinuteKey * 60000);
    const issPasses = predictUpcomingPasses(tles.iss, userLocation, refDate, 24, 5);
    const cssPasses = predictUpcomingPasses(tles.tiangong, userLocation, refDate, 24, 5);
    return [...issPasses, ...cssPasses].sort(
      (a, b) => a.aosTime.getTime() - b.aosTime.getTime()
    );
  }, [tles, userLocation, passMinuteKey]);

  return {
    now,
    tles,
    stations,
    upcomingPasses,
    isRefreshingTle,
    refreshTles,
  };
}
