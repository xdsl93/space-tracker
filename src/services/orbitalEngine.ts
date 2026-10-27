import * as satellite from 'satellite.js';
import { STATION_METADATA } from '../data/defaultTles';
import {
  GeoPoint,
  PassSkyQuality,
  SatellitePass,
  StationId,
  StationTelemetry,
  TleData,
  UserLocation,
} from '../types/station';

const EARTH_RADIUS_KM = 6371.0;
const SPEED_OF_LIGHT_KMS = 299792.458;

/**
 * Converts latitude and longitude to a 6-character Maidenhead Grid Square Locator (e.g. JN45hk)
 */
export function latLonToMaidenhead(lat: number, lon: number): string {
  const adjLon = lon + 180;
  const adjLat = lat + 90;

  const fieldLon = Math.floor(adjLon / 20);
  const fieldLat = Math.floor(adjLat / 10);

  const squareLon = Math.floor((adjLon % 20) / 2);
  const squareLat = Math.floor(adjLat % 10);

  const subLon = Math.floor(((adjLon % 20) % 2) * 12);
  const subLat = Math.floor((adjLat % 10 - squareLat) * 24);

  const A = 'A'.charCodeAt(0);
  const a = 'a'.charCodeAt(0);

  return (
    String.fromCharCode(A + Math.max(0, Math.min(17, fieldLon))) +
    String.fromCharCode(A + Math.max(0, Math.min(17, fieldLat))) +
    String(Math.max(0, Math.min(9, squareLon))) +
    String(Math.max(0, Math.min(9, squareLat))) +
    String.fromCharCode(a + Math.max(0, Math.min(23, subLon))) +
    String.fromCharCode(a + Math.max(0, Math.min(23, subLat)))
  );
}

/**
 * Computes the subsolar point (latitude & longitude where the Sun is directly overhead at the given UTC Date)
 */
export function getSubsolarPoint(date: Date): { lat: number; lon: number; declinationRad: number } {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // Days since J2000.0
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;

  // Mean longitude of the Sun
  const L = (280.46 + 0.9856474 * n) % 360;
  // Mean anomaly of the Sun
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;

  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  // Obliquity of the ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * rad;

  // Sun's declination
  const sinDec = Math.sin(epsilon) * Math.sin(lambda);
  const declinationRad = Math.asin(sinDec);
  const subsolarLat = declinationRad * deg;

  // Equation of time approximation (minutes)
  const y = Math.tan(epsilon / 2) ** 2;
  const Lrad = L * rad;
  const eqTimeMin =
    4 *
    deg *
    (y * Math.sin(2 * Lrad) -
      2 * 0.01671 * Math.sin(g) +
      4 * 0.01671 * y * Math.sin(g) * Math.cos(2 * Lrad));

  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  let subsolarLon = -15 * (utcHours - 12 + eqTimeMin / 60);
  subsolarLon = ((((subsolarLon + 180) % 360) + 360) % 360) - 180;

  return {
    lat: subsolarLat,
    lon: subsolarLon,
    declinationRad,
  };
}

/**
 * Computes the Sun's elevation angle (degrees above/below horizon) at the observer's location
 */
export function getSunElevationAtLocation(lat: number, lon: number, date: Date): number {
  const subsolar = getSubsolarPoint(date);
  const deg2rad = Math.PI / 180;
  const latR = lat * deg2rad;
  const lonR = lon * deg2rad;
  const sunLatR = subsolar.lat * deg2rad;
  const sunLonR = subsolar.lon * deg2rad;

  const sinAlt =
    Math.sin(latR) * Math.sin(sunLatR) +
    Math.cos(latR) * Math.cos(sunLatR) * Math.cos(lonR - sunLonR);

  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/**
 * Determines if a satellite at (lat, lon, altKm) is in direct sunlight or in Earth's cylindrical shadow
 */
export function isSatelliteSunlit(lat: number, lon: number, altKm: number, date: Date): boolean {
  const subsolar = getSubsolarPoint(date);
  const deg2rad = Math.PI / 180;

  const latR = lat * deg2rad;
  const lonR = lon * deg2rad;
  const sunLatR = subsolar.lat * deg2rad;
  const sunLonR = subsolar.lon * deg2rad;

  // Cosine of angle between satellite position vector and sun direction vector
  const cosAngle =
    Math.sin(latR) * Math.sin(sunLatR) +
    Math.cos(latR) * Math.cos(sunLatR) * Math.cos(lonR - sunLonR);

  if (cosAngle >= 0) {
    return true; // Day side of Earth
  }

  // On night side: check if satellite altitude lifts it out of Earth's shadow cylinder
  const rSat = EARTH_RADIUS_KM + altKm;
  const sinAngle = Math.sqrt(Math.max(0, 1 - cosAngle * cosAngle));
  const perpDistKm = rSat * sinAngle;

  return perpDistKm > EARTH_RADIUS_KM;
}

/**
 * Calculates initial bearing from point 1 to point 2 in degrees (0-360)
 */
function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Propagates a single point in time for a satellite record
 */
function propagatePoint(satrec: satellite.SatRec, date: Date): GeoPoint | null {
  const pv = satellite.propagate(satrec, date);
  if (!pv.position || typeof pv.position === 'boolean') return null;

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pv.position, gmst);

  return {
    lat: satellite.degreesLat(gd.latitude),
    lon: satellite.degreesLong(gd.longitude),
    altKm: gd.height,
    timestamp: date.getTime(),
  };
}

/**
 * Computes full live telemetry and orbital tracks for a space station
 */
export function computeStationTelemetry(
  tle: TleData,
  userLocation: UserLocation,
  now: Date
): StationTelemetry | null {
  const meta = STATION_METADATA[tle.id];
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  const pvNow = satellite.propagate(satrec, now);
  if (!pvNow.position || typeof pvNow.position === 'boolean' || !pvNow.velocity || typeof pvNow.velocity === 'boolean') {
    return null;
  }

  const gmstNow = satellite.gstime(now);
  const gdNow = satellite.eciToGeodetic(pvNow.position, gmstNow);

  const lat = satellite.degreesLat(gdNow.latitude);
  const lon = satellite.degreesLong(gdNow.longitude);
  const altKm = gdNow.height;

  const vx = pvNow.velocity.x;
  const vy = pvNow.velocity.y;
  const vz = pvNow.velocity.z;
  const velocityKms = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const velocityKmh = velocityKms * 3600;

  // Next second point for heading vector
  const nextSec = new Date(now.getTime() + 2000);
  const nextPt = propagatePoint(satrec, nextSec);
  const headingDeg = nextPt ? calculateHeading(lat, lon, nextPt.lat, nextPt.lon) : 90;

  // Observer look angles and radial velocity (for Doppler shift)
  const observerGd = {
    longitude: satellite.degreesToRadians(userLocation.lon),
    latitude: satellite.degreesToRadians(userLocation.lat),
    height: (userLocation.altitudeMeters || 50) / 1000,
  };

  const positionEcf = satellite.eciToEcf(pvNow.position, gmstNow);
  const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

  const azimuthDeg = (lookAngles.azimuth * 180) / Math.PI;
  const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
  const distanceToUserKm = lookAngles.rangeSat;

  // Calculate radial velocity (range rate in km/s) by finite difference over 2 seconds
  let rangeRateKms = 0;
  if (nextPt) {
    const pvNext = satellite.propagate(satrec, nextSec);
    if (pvNext.position && typeof pvNext.position !== 'boolean') {
      const gmstNext = satellite.gstime(nextSec);
      const posEcfNext = satellite.eciToEcf(pvNext.position, gmstNext);
      const lookNext = satellite.ecfToLookAngles(observerGd, posEcfNext);
      rangeRateKms = (lookNext.rangeSat - distanceToUserKm) / 2.0;
    }
  }

  // Footprint radius along Earth surface: d = R * arccos(R / (R + h))
  const visibilityFootprintRadiusKm =
    EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(10, altKm)));

  // Mean motion from TLE line 2 (revolutions per day)
  const meanMotionRevDay = parseFloat(tle.line2.substring(52, 63)) || 15.5;
  const periodMinutes = 1440 / meanMotionRevDay;

  // Base orbit number from TLE line 2 (columns 64-68)
  const baseOrbit = parseInt(tle.line2.substring(63, 68).trim(), 10) || 49500;
  const orbitNumber = baseOrbit;

  // Past track (-45 min) and Future track (+95 min, >1 full sinusoidal orbit)
  const pastTrack: GeoPoint[] = [];
  const futureTrack: GeoPoint[] = [];

  for (let m = -45; m <= 0; m += 1.5) {
    const pt = propagatePoint(satrec, new Date(now.getTime() + m * 60000));
    if (pt) pastTrack.push(pt);
  }

  for (let m = 0; m <= 96; m += 1.0) {
    const pt = propagatePoint(satrec, new Date(now.getTime() + m * 60000));
    if (pt) futureTrack.push(pt);
  }

  return {
    id: tle.id,
    name: meta.name,
    shortName: meta.shortName,
    noradId: meta.noradId,
    designator: meta.designator,
    agency: meta.agency,
    color: meta.color,
    accentColor: meta.accentColor,
    lat,
    lon,
    altKm,
    velocityKmh,
    velocityKms,
    headingDeg,
    inclinationDeg: meta.inclinationDeg,
    periodMinutes,
    orbitNumber,
    isSunlit: isSatelliteSunlit(lat, lon, altKm, now),
    visibilityFootprintRadiusKm,
    maidenheadGrid: latLonToMaidenhead(lat, lon),
    distanceToUserKm,
    azimuthDeg,
    elevationDeg,
    rangeRateKms,
    isAboveHorizon: elevationDeg > 0,
    pastTrack,
    futureTrack,
  };
}

/**
 * Calculates Doppler-shifted frequency in MHz and shift in Hz
 */
export function calculateDopplerShift(
  nominalMhz: number,
  rangeRateKms: number,
  direction: 'downlink' | 'uplink' = 'downlink'
): { shiftedMhz: number; shiftHz: number } {
  const nominalHz = nominalMhz * 1e6;
  const sign = direction === 'downlink' ? -1 : 1;
  const shiftHz = sign * nominalHz * (rangeRateKms / SPEED_OF_LIGHT_KMS);
  const shiftedMhz = (nominalHz + shiftHz) / 1e6;

  return {
    shiftedMhz,
    shiftHz,
  };
}

/**
 * Predicts upcoming visible/radio passes over the user's location for a configurable time horizon
 */
export function predictUpcomingPasses(
  tle: TleData,
  userLocation: UserLocation,
  startTime: Date,
  hoursAhead = 48,
  minElevationDeg = 5,
  maxCount = 25
): SatellitePass[] {
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
  const meta = STATION_METADATA[tle.id];
  const observerGd = {
    longitude: satellite.degreesToRadians(userLocation.lon),
    latitude: satellite.degreesToRadians(userLocation.lat),
    height: (userLocation.altitudeMeters || 50) / 1000,
  };

  const passes: SatellitePass[] = [];
  const stepMs = 30 * 1000;
  const endMs = startTime.getTime() + hoursAhead * 3600 * 1000;

  let inPass = false;
  let currentAosTime = startTime;
  let currentAosAz = 0;
  let maxEl = -90;
  let maxElTime = startTime;
  let maxAz = 0;
  let sunlitAtPeak = false;

  for (let t = startTime.getTime(); t <= endMs; t += stepMs) {
    const d = new Date(t);
    const pv = satellite.propagate(satrec, d);
    if (!pv.position || typeof pv.position === 'boolean') continue;

    const gmst = satellite.gstime(d);
    const posEcf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, posEcf);

    const elDeg = (look.elevation * 180) / Math.PI;
    const azDeg = (look.azimuth * 180) / Math.PI;

    if (elDeg > 0) {
      if (!inPass) {
        inPass = true;
        currentAosTime = d;
        currentAosAz = azDeg;
        maxEl = elDeg;
        maxElTime = d;
        maxAz = azDeg;
      }
      if (elDeg > maxEl) {
        maxEl = elDeg;
        maxElTime = d;
        maxAz = azDeg;
        const gd = satellite.eciToGeodetic(pv.position, gmst);
        sunlitAtPeak = isSatelliteSunlit(
          satellite.degreesLat(gd.latitude),
          satellite.degreesLong(gd.longitude),
          gd.height,
          d
        );
      }
    } else if (inPass) {
      inPass = false;
      if (maxEl >= minElevationDeg) {
        const durationSeconds = Math.max(30, Math.round((d.getTime() - currentAosTime.getTime()) / 1000));
        const observerSunElevationDeg = getSunElevationAtLocation(
          userLocation.lat,
          userLocation.lon,
          maxElTime
        );

        // Naked eye sighting occurs when the station is sunlit AND the observer's sky is dark/twilight (Sun < -4°)
        const isVisuallyObservable = sunlitAtPeak && observerSunElevationDeg <= -4;
        let skyQuality: PassSkyQuality = 'eclipse_radio_only';
        if (isVisuallyObservable) {
          skyQuality = 'naked_eye';
        } else if (sunlitAtPeak) {
          skyQuality = 'daylight_or_bright_twilight';
        }

        passes.push({
          id: `${tle.id}-${currentAosTime.getTime()}`,
          stationId: tle.id as StationId,
          stationName: meta.shortName,
          aosTime: currentAosTime,
          aosAzimuth: currentAosAz,
          maxElTime,
          maxElevation: maxEl,
          maxAzimuth: maxAz,
          losTime: d,
          losAzimuth: azDeg,
          durationSeconds,
          isSunlitPass: sunlitAtPeak,
          observerSunElevationDeg,
          isVisuallyObservable,
          skyQuality,
        });
        if (passes.length >= maxCount) break;
      }
    }
  }

  return passes;
}
