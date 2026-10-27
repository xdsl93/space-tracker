import {
  CalendarClock,
  Check,
  Compass,
  Eye,
  Filter,
  MapPin,
  Moon,
  Navigation,
  Radio,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { latLonToMaidenhead, predictUpcomingPasses } from '../services/orbitalEngine';
import {
  SatellitePass,
  StationId,
  TleData,
  UserLocation,
} from '../types/station';

interface SightingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tles: Record<StationId, TleData>;
  userLocation: UserLocation;
  isLocating: boolean;
  onRequestGps: () => void;
  onSetManualLocation: (lat: number, lon: number, label?: string) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Roma, IT', lat: 41.9028, lon: 12.4964 },
  { name: 'Milano, IT', lat: 45.4642, lon: 9.19 },
  { name: 'Napoli, IT', lat: 40.8518, lon: 14.2681 },
  { name: 'Torino, IT', lat: 45.0703, lon: 7.6869 },
  { name: 'Firenze, IT', lat: 43.7696, lon: 11.2558 },
  { name: 'Bologna, IT', lat: 44.4949, lon: 11.3426 },
  { name: 'Bari, IT', lat: 41.1171, lon: 16.8719 },
  { name: 'Palermo, IT', lat: 38.1157, lon: 13.3615 },
  { name: 'Cagliari, IT', lat: 39.2238, lon: 9.1217 },
  { name: 'Venezia, IT', lat: 45.4408, lon: 12.3155 },
  { name: 'Londra, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'New York, US', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo, JP', lat: 35.6762, lon: 139.6503 },
];

function azimuthToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function formatTimeUntil(target: Date): string {
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return 'In corso ora!';
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `tra ${days}g ${hours}h`;
  if (hours > 0) return `tra ${hours}h ${mins}m`;
  return `tra ${mins} min`;
}

export const SightingsModal: React.FC<SightingsModalProps> = ({
  isOpen,
  onClose,
  tles,
  userLocation,
  isLocating,
  onRequestGps,
  onSetManualLocation,
}) => {
  const [latInput, setLatInput] = useState(userLocation.lat.toFixed(4));
  const [lonInput, setLonInput] = useState(userLocation.lon.toFixed(4));
  const [customLabel, setCustomLabel] = useState(userLocation.label);

  // Filters for pass prediction
  const [hoursAhead, setHoursAhead] = useState<number>(72); // Default 3 days
  const [minElevation, setMinElevation] = useState<number>(10);
  const [stationFilter, setStationFilter] = useState<'all' | StationId>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'naked_eye' | 'sunlit'>('all');
  const [justUpdatedFeedback, setJustUpdatedFeedback] = useState(false);

  useEffect(() => {
    setLatInput(userLocation.lat.toFixed(4));
    setLonInput(userLocation.lon.toFixed(4));
    setCustomLabel(userLocation.label);
  }, [userLocation.lat, userLocation.lon, userLocation.label]);

  // Dynamically recompute passes whenever location, horizon or minElevation changes
  const computedPasses = useMemo<SatellitePass[]>(() => {
    if (!isOpen) return [];
    const start = new Date();
    const issList = predictUpcomingPasses(
      tles.iss,
      userLocation,
      start,
      hoursAhead,
      minElevation,
      40
    );
    const tiangongList = predictUpcomingPasses(
      tles.tiangong,
      userLocation,
      start,
      hoursAhead,
      minElevation,
      40
    );

    return [...issList, ...tiangongList]
      .filter((p) => {
        if (stationFilter !== 'all' && p.stationId !== stationFilter) return false;
        if (visibilityFilter === 'naked_eye' && !p.isVisuallyObservable) return false;
        if (visibilityFilter === 'sunlit' && !p.isSunlitPass) return false;
        return true;
      })
      .sort((a, b) => a.aosTime.getTime() - b.aosTime.getTime());
  }, [isOpen, tles, userLocation, hoursAhead, minElevation, stationFilter, visibilityFilter]);

  if (!isOpen) return null;

  const userQth = latLonToMaidenhead(userLocation.lat, userLocation.lon);

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLon = parseFloat(lonInput);
    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)) {
      const labelToUse =
        customLabel && customLabel !== userLocation.label
          ? customLabel
          : `Manuale (${parsedLat.toFixed(2)}°, ${parsedLon.toFixed(2)}°)`;
      onSetManualLocation(parsedLat, parsedLon, labelToUse);
      setJustUpdatedFeedback(true);
      setTimeout(() => setJustUpdatedFeedback(false), 2000);
    }
  };

  const handleSelectPreset = (city: { name: string; lat: number; lon: number }) => {
    setLatInput(city.lat.toFixed(4));
    setLonInput(city.lon.toFixed(4));
    setCustomLabel(city.name);
    onSetManualLocation(city.lat, city.lon, city.name);
    setJustUpdatedFeedback(true);
    setTimeout(() => setJustUpdatedFeedback(false), 2000);
  };

  const nakedEyeCount = computedPasses.filter((p) => p.isVisuallyObservable).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#070d1f] border border-slate-700/90 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40">
              <CalendarClock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Calendario Prossimi Avvistamenti &amp; Finestre Orarie
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  RICALCOLO SGP4 ISTANTANEO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cambia la tua posizione (GPS o manuale) per ricalcolare in tempo reale gli orari di passaggio di ISS e Tiangong
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition"
            title="Chiudi modale"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Panel: Interactive Location Editor & Presets */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-xs sm:text-sm font-bold text-white">
                  Posizione di Osservazione Attiva:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                  {userLocation.label} ({userLocation.lat.toFixed(3)}°, {userLocation.lon.toFixed(3)}°) • QTH {userQth}
                </span>
                {justUpdatedFeedback && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-cyan-300 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Finestre orarie aggiornate!
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onRequestGps}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isLocating ? 'Rilevamento GPS...' : 'Usa Posizione GPS Attuale'}</span>
              </button>
            </div>

            {/* Manual Coordinates Form */}
            <form
              onSubmit={handleApplyManualCoords}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80 items-end"
            >
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Latitudine (-90° / +90°)
                </label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="es. 41.9028"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Longitudine (-180° / +180°)
                </label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="es. 12.4964"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Nome Località (Opzionale)
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  placeholder="es. Osservatorio Casa"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-1.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
                >
                  Aggiorna Posizione &amp; Orari
                </button>
              </div>
            </form>

            {/* Quick City Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400 font-mono">
                Scelta rapida città (clicca per ricalcolare subito le finestre di avvistamento):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LOCATIONS.map((city) => {
                  const isCurrent =
                    Math.abs(userLocation.lat - city.lat) < 0.05 &&
                    Math.abs(userLocation.lon - city.lon) < 0.05;
                  return (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => handleSelectPreset(city)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 font-bold'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filter Bar: Station, Visibility Type, Time Window, Min Elevation */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/90 p-3 rounded-xl text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-slate-400 font-semibold mr-1">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Filtri:</span>
              </span>

              {/* Station selector */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono">
                {(['all', 'iss', 'tiangong'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStationFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      stationFilter === st
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'Tutte' : st === 'iss' ? 'ISS' : 'Tiangong'}
                  </button>
                ))}
              </div>

              {/* Visibility selector */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono">
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    visibilityFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tutti (Radio + Ottici)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibilityFilter('naked_eye')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                    visibilityFilter === 'naked_eye'
                      ? 'bg-amber-500/25 text-amber-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Visibili a Occhio Nudo ({nakedEyeCount})</span>
                </button>
              </div>
            </div>

            {/* Horizon & Elevation Controls */}
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Finestra:</span>
                <select
                  value={hoursAhead}
                  onChange={(e) => setHoursAhead(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                >
                  <option value={24}>Prossime 24h</option>
                  <option value={48}>Prossime 48h (2 giorni)</option>
                  <option value={72}>Prossime 72h (3 giorni)</option>
                  <option value={120}>Prossimi 5 giorni</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Elev. Min:</span>
                <select
                  value={minElevation}
                  onChange={(e) => setMinElevation(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                >
                  <option value={5}>&ge; 5° (Tutti)</option>
                  <option value={10}>&ge; 10° (Consigliato)</option>
                  <option value={25}>&ge; 25° (Passaggi Alti)</option>
                  <option value={45}>&ge; 45° (Zenitali)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results List / Table */}
          {computedPasses.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
              <p className="text-sm text-slate-300 font-semibold">
                Nessun avvistamento trovato con i filtri selezionati.
              </p>
              <p className="text-xs text-slate-400">
                Prova ad estendere la finestra temporale a 72h/5 giorni, ridurre l'elevazione minima a 5° o selezionare "Tutti (Radio + Ottici)".
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-3 px-3">Stazione</th>
                    <th className="py-3 px-3">Data &amp; Countdown</th>
                    <th className="py-3 px-3">Sorge (AOS)</th>
                    <th className="py-3 px-3">Culmine (Max El)</th>
                    <th className="py-3 px-3">Tramonta (LOS)</th>
                    <th className="py-3 px-3">Durata</th>
                    <th className="py-3 px-3">Visibilità &amp; Cielo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {computedPasses.map((p) => {
                    const isHigh = p.maxElevation >= 40;
                    return (
                      <tr
                        key={p.id}
                        className={`transition ${
                          p.isVisuallyObservable
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Station */}
                        <td className="py-3 px-3 font-bold">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                              p.stationId === 'iss'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {p.stationName}
                          </span>
                        </td>

                        {/* Date & Countdown */}
                        <td className="py-3 px-3">
                          <div className="text-white font-semibold">
                            {p.aosTime.toLocaleDateString('it-IT', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                          <div className="text-[11px] text-cyan-400">
                            {formatTimeUntil(p.aosTime)}
                          </div>
                        </td>

                        {/* AOS */}
                        <td className="py-3 px-3">
                          <div className="text-slate-100 font-semibold">
                            {p.aosTime.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Az {Math.round(p.aosAzimuth)}° ({azimuthToCompass(p.aosAzimuth)})
                          </div>
                        </td>

                        {/* Max Elevation */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Compass
                              className={`w-3.5 h-3.5 ${
                                isHigh ? 'text-emerald-400' : 'text-cyan-400'
                              }`}
                            />
                            <span
                              className={`text-sm font-bold ${
                                isHigh ? 'text-emerald-300' : 'text-cyan-300'
                              }`}
                            >
                              {p.maxElevation.toFixed(1)}°
                            </span>
                            {isHigh && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                                ALTO
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {p.maxElTime.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            • {azimuthToCompass(p.maxAzimuth)}
                          </div>
                        </td>

                        {/* LOS */}
                        <td className="py-3 px-3">
                          <div className="text-slate-200">
                            {p.losTime.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Az {Math.round(p.losAzimuth)}° ({azimuthToCompass(p.losAzimuth)})
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-3 text-slate-300">
                          {Math.floor(p.durationSeconds / 60)}m {p.durationSeconds % 60}s
                        </td>

                        {/* Sky & Sighting Quality */}
                        <td className="py-3 px-3">
                          {p.skyQuality === 'naked_eye' ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold text-[11px]">
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>Visibile a Occhio Nudo</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Stazione al Sole • Cielo buio (Sole {p.observerSunElevationDeg.toFixed(0)}°)
                              </span>
                            </div>
                          ) : p.skyQuality === 'daylight_or_bright_twilight' ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-sky-300 text-[11px]">
                                <Sun className="w-3.5 h-3.5 text-amber-400" />
                                <Radio className="w-3.5 h-3.5 text-sky-400" />
                                <span>Diurno (Ascolto Radio)</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Cielo chiaro (Sole +{p.observerSunElevationDeg.toFixed(0)}°)
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                                <span>In Eclissi (Solo Radio)</span>
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Cono d'ombra terrestre
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Visibile a Occhio Nudo</strong>: la stazione riflette la luce solare mentre il cielo dell'osservatore è in crepuscolo o notte. Tutti i passaggi sono sempre validi per l'<strong>ascolto radio VHF/UHF</strong>!
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
