import {
  Activity,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Gauge,
  Globe,
  Layers,
  Moon,
  Navigation,
  Orbit,
  Radio,
  Sun,
  Terminal,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { STATION_METADATA } from '../../data/defaultTles';
import { useLanguage } from '../../i18n/LanguageContext';
import { StationId, StationTelemetry, TleData, UserLocation } from '../../types/station';

interface TelemetryGridProps {
  station: StationTelemetry;
  allStations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
  onSelectStation: (id: StationId) => void;
  tle: TleData;
  userLocation: UserLocation;
}

function formatCoord(val: number, posChar: string, negChar: string): string {
  const dir = val >= 0 ? posChar : negChar;
  return `${Math.abs(val).toFixed(2)}° ${dir}`;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  station,
  allStations,
  selectedStationId,
  onSelectStation,
  tle,
  userLocation,
}) => {
  const { t, formatNumber } = useLanguage();
  // Collapsed by default on mobile (< 768px), expanded on desktop
  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [isComparisonExpanded, setIsComparisonExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [showTleInspector, setShowTleInspector] = useState(false);

  const meta = STATION_METADATA[station.id];
  const crewText = t.crew[station.id] || meta.crewInfo;

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Accordion 1: Live Telemetry for Selected Station */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 overflow-hidden shadow-lg">
        {/* Accordion Header (Always visible, shows compact summary when collapsed) */}
        <button
          type="button"
          onClick={() => setIsTelemetryExpanded((prev) => !prev)}
          className="w-full p-3.5 sm:p-5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {t.telemetry.liveTelemetry}{' '}
                <span style={{ color: station.color }}>{station.shortName}</span>
              </h3>

              {station.isSunlit ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>{t.common.sunlit}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>{t.common.eclipse}</span>
                </span>
              )}

              {station.isAboveHorizon && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 animate-pulse">
                  <Radio className="w-3 h-3" />
                  <span>{t.common.inSight}</span>
                </span>
              )}
            </div>

            {/* Quick Summary Strip when collapsed */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-300">
              <span>
                Lat/Lon:{' '}
                <strong className="text-white">
                  {station.lat.toFixed(1)}°, {station.lon.toFixed(1)}°
                </strong>
              </span>
              <span>
                {t.telemetry.altitudeShort}: <strong className="text-cyan-300">{station.altKm.toFixed(0)} km</strong>
              </span>
              <span>
                {t.telemetry.velocity}:{' '}
                <strong className="text-amber-300">
                  {formatNumber(Math.round(station.velocityKmh))} km/h
                </strong>
              </span>
              <span>
                {t.telemetry.distanceToYou}:{' '}
                <strong className="text-emerald-300">
                  {formatNumber(Math.round(station.distanceToUserKm))} km
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400 shrink-0">
            <span className="hidden sm:inline">
              {isTelemetryExpanded ? t.common.collapse : t.common.expand}
            </span>
            {isTelemetryExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Accordion Content */}
        {isTelemetryExpanded && (
          <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-800/80 space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {/* Card 1: Coordinates */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.coordinates}</span>
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white">
                  {formatCoord(station.lat, 'N', 'S')}
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-cyan-300">
                  {formatCoord(station.lon, 'E', 'W')}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  QTH: <strong className="text-slate-200">{station.maidenheadGrid}</strong>
                </div>
              </div>

              {/* Card 2: Altitude & Footprint */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.altitude}</span>
                  <Orbit className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {station.altKm.toFixed(1)} <span className="text-xs text-slate-400">km</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  {t.telemetry.footprintRadius}{' '}
                  <strong className="text-slate-200">
                    {formatNumber(Math.round(station.visibilityFootprintRadiusKm))} km
                  </strong>
                </div>
              </div>

              {/* Card 3: Orbital Velocity */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.velocity}</span>
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-amber-300">
                  {formatNumber(Math.round(station.velocityKmh))}{' '}
                  <span className="text-[10px] text-slate-400">km/h</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  {station.velocityKms.toFixed(2)} km/s • {t.telemetry.heading} {Math.round(station.headingDeg)}°
                </div>
              </div>

              {/* Card 4: Look Angles from User */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.azimuthElevation}</span>
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white">
                  Az: {station.azimuthDeg.toFixed(1)}°
                </div>
                <div
                  className={`text-xs sm:text-sm font-mono font-bold ${
                    station.elevationDeg > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  El: {station.elevationDeg > 0 ? '+' : ''}
                  {station.elevationDeg.toFixed(1)}°
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">
                  {t.telemetry.from} {userLocation.label}
                </div>
              </div>

              {/* Card 5: Slant Range & Radial Velocity */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.distanceToYou}</span>
                  <Navigation className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(Math.round(station.distanceToUserKm))}{' '}
                  <span className="text-xs text-slate-400">km</span>
                </div>
                <div className="text-[10px] font-mono mt-1">
                  <span
                    className={
                      station.rangeRateKms < 0
                        ? 'text-cyan-400 font-semibold'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    {station.rangeRateKms < 0 ? t.telemetry.approaching : t.telemetry.receding}
                    {Math.abs(station.rangeRateKms).toFixed(2)} km/s
                  </span>
                </div>
              </div>

              {/* Card 6: Orbit Info */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{t.telemetry.orbitNumber}</span>
                  <Eye className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white">
                  {t.telemetry.rev}{station.orbitNumber}
                </div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5">
                  {t.telemetry.period} {station.periodMinutes.toFixed(1)} m
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {t.telemetry.inclination} {meta.inclinationDeg}°
                </div>
              </div>
            </div>

            {/* Crew & TLE Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <strong className="text-slate-200">{crewText}</strong>
                </span>
                <span>
                  {t.telemetry.dimensions} <strong className="text-slate-300">{meta.dimensions}</strong>
                </span>
                <span>
                  {t.telemetry.mass} <strong className="text-slate-300">{meta.massKg}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowTleInspector((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-300 transition"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showTleInspector ? t.telemetry.hideTle : t.telemetry.showTle}</span>
                {showTleInspector ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {showTleInspector && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 font-mono text-[10px] sm:text-[11px] text-slate-400 overflow-x-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1 text-slate-300">
                  <span className="font-semibold text-cyan-400">
                    {t.telemetry.twoLineElement} ({station.shortName} — NORAD {station.noradId})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                    {t.telemetry.source} {tle.source.toUpperCase()}
                  </span>
                </div>
                <pre className="text-slate-300 leading-relaxed select-all">
{tle.line1}
{'\n'}
{tle.line2}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Quick Comparison ISS vs Tiangong */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsComparisonExpanded((prev) => !prev)}
          className="w-full p-3.5 sm:px-5 sm:py-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white">
              {t.telemetry.quickComparison}
            </span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400">
            {isComparisonExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {isComparisonExpanded && (
          <div className="p-3.5 sm:px-5 sm:pb-4 pt-1 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(['iss', 'tiangong'] as StationId[]).map((id) => {
              const st = allStations[id];
              const isSelected = id === selectedStationId;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectStation(id)}
                  className={`text-left rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-950 border-cyan-500/70 shadow-md ring-1 ring-cyan-400/25'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: st.color }}
                      />
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {st.name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      Lat {st.lat.toFixed(1)}° • Lon {st.lon.toFixed(1)}° • {t.telemetry.altitudeShort} {st.altKm.toFixed(0)} km
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className="text-xs font-bold text-emerald-300">
                      {formatNumber(Math.round(st.distanceToUserKm))} km
                    </div>
                    <div className="text-[10px] text-slate-400">
                      El: {st.elevationDeg.toFixed(1)}°
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
