export type StationId = 'iss' | 'tiangong';

export interface TleData {
  id: StationId;
  name: string;
  noradId: number;
  line1: string;
  line2: string;
  updatedAt: number;
  source: 'celestrak' | 'wheretheiss' | 'fallback';
}

export interface GeoPoint {
  lat: number;
  lon: number;
  altKm: number;
  timestamp: number;
}

export interface UserLocation {
  lat: number;
  lon: number;
  altitudeMeters: number;
  label: string;
  source: 'gps' | 'manual' | 'default';
}

export interface StationTelemetry {
  id: StationId;
  name: string;
  shortName: string;
  noradId: number;
  designator: string;
  agency: string;
  color: string;
  accentColor: string;
  lat: number;
  lon: number;
  altKm: number;
  velocityKmh: number;
  velocityKms: number;
  headingDeg: number; // Direction of travel in degrees (0=N, 90=E)
  inclinationDeg: number;
  periodMinutes: number;
  orbitNumber: number;
  isSunlit: boolean; // True = in daylight, False = in Earth's shadow (eclipse)
  visibilityFootprintRadiusKm: number;
  maidenheadGrid: string; // QTH Locator e.g. JN45
  // Relative to user
  distanceToUserKm: number;
  azimuthDeg: number;
  elevationDeg: number;
  rangeRateKms: number; // Radial velocity (positive = moving away, negative = approaching)
  isAboveHorizon: boolean;
  // Orbit tracks
  pastTrack: GeoPoint[];
  futureTrack: GeoPoint[];
}

export interface RadioFrequency {
  id: string;
  stationId: StationId;
  stationName: string;
  title: string;
  titleEn?: string;
  downlinkMhz?: number;
  uplinkMhz?: number;
  mode: string;
  ctcssHz?: number;
  status: 'Attivo' | 'Periodico / Eventi' | 'Standby / Backup' | 'Telemetria';
  statusEn?: string;
  region: string;
  regionEn?: string;
  description: string;
  descriptionEn?: string;
  listeningTips: string;
  listeningTipsEn?: string;
}

export type PassSkyQuality = 'naked_eye' | 'daylight_or_bright_twilight' | 'eclipse_radio_only';

export interface SatellitePass {
  id: string;
  stationId: StationId;
  stationName: string;
  aosTime: Date;
  aosAzimuth: number;
  maxElTime: Date;
  maxElevation: number;
  maxAzimuth: number;
  losTime: Date;
  losAzimuth: number;
  durationSeconds: number;
  isSunlitPass: boolean;
  observerSunElevationDeg: number; // Sun elevation at user location at peak (< -4° means dark enough for naked-eye sighting)
  isVisuallyObservable: boolean;   // True if satellite is sunlit AND observer sky is dark/twilight
  skyQuality: PassSkyQuality;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface NotificationPreferences {
  enabled: boolean;
  stations: Record<StationId, boolean>;
  onlyVisuallyObservable: boolean; // true = only naked-eye visible passes, false = all passes within range/elevation
  minElevationDeg: number;         // Minimum elevation above horizon (e.g. 5, 10, 20, 40)
  maxDistanceKm: number;           // Max slant/ground distance in km to consider "near user" (e.g. 1500, 2200, 3000)
  notifyOnEnterVisibility: boolean; // Immediate push when station enters visibility / proximity threshold
  notifyOnPrePassMinutes: number;  // 0 = disabled, or 5 / 10 / 15 minutes before AOS
  soundEnabled: boolean;           // Optional telemetry audio beep on alert
}

export interface PassAlertNotification {
  id: string;
  stationId: StationId;
  stationName: string;
  title: string;
  body: string;
  timestamp: number;
  type: 'proximity' | 'pre_pass' | 'scheduled_pass' | 'test';
}
