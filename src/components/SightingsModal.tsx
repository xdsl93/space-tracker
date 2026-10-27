import {
  Bell,
  BellRing,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  Radio,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageContext';
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
  scheduledPassIds: string[];
  onTogglePassReminder: (pass: SatellitePass) => Promise<boolean>;
  onOpenNotificationsModal: () => void;
}

interface GeocodedCity {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  elevation?: number;
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

export const SightingsModal: React.FC<SightingsModalProps> = ({
  isOpen,
  onClose,
  tles,
  userLocation,
  isLocating,
  onRequestGps,
  onSetManualLocation,
  scheduledPassIds,
  onTogglePassReminder,
  onOpenNotificationsModal,
}) => {
  const {
    t,
    formatTime,
    formatDate,
    getCompassDirection,
    formatTimeUntil,
    language,
  } = useLanguage();

  const [latInput, setLatInput] = useState(userLocation.lat.toFixed(4));
  const [lonInput, setLonInput] = useState(userLocation.lon.toFixed(4));
  const [customLabel, setCustomLabel] = useState(userLocation.label);

  // City Search Autocomplete state (Open-Meteo Public Geocoding API)
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<GeocodedCity[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [hoursAhead, setHoursAhead] = useState<number>(72);
  const [minElevation, setMinElevation] = useState<number>(10);
  const [stationFilter, setStationFilter] = useState<'all' | StationId>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'naked_eye' | 'sunlit'>('all');
  const [justUpdatedFeedback, setJustUpdatedFeedback] = useState(false);

  const [isPassListOpen, setIsPassListOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);

  useEffect(() => {
    setLatInput(userLocation.lat.toFixed(4));
    setLonInput(userLocation.lon.toFixed(4));
    setCustomLabel(userLocation.label);
  }, [userLocation.lat, userLocation.lon, userLocation.label]);

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Close autocomplete dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced public API call to Open-Meteo Geocoding API
  useEffect(() => {
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setCitySuggestions([]);
      setIsSearchingCities(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearchingCities(true);
      try {
        const langCode = language === 'it' ? 'it' : 'en';
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          trimmed
        )}&count=8&language=${langCode}&format=json`;
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setCitySuggestions(data.results || []);
          setShowDropdown(true);
        }
      } catch {
        // Ignore abort or network errors
      } finally {
        setIsSearchingCities(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cityQuery, language]);

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

  const triggerUpdatedBadge = () => {
    setJustUpdatedFeedback(true);
    setTimeout(() => setJustUpdatedFeedback(false), 2500);
  };

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(latInput);
    const parsedLon = parseFloat(lonInput);
    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)) {
      const manualWord = language === 'it' ? 'Manuale' : 'Manual';
      const labelToUse =
        customLabel && customLabel !== userLocation.label
          ? customLabel
          : `${manualWord} (${parsedLat.toFixed(2)}°, ${parsedLon.toFixed(2)}°)`;
      onSetManualLocation(parsedLat, parsedLon, labelToUse);
      triggerUpdatedBadge();
    }
  };

  const handleSelectPreset = (city: { name: string; lat: number; lon: number }) => {
    setLatInput(city.lat.toFixed(4));
    setLonInput(city.lon.toFixed(4));
    setCustomLabel(city.name);
    onSetManualLocation(city.lat, city.lon, city.name);
    triggerUpdatedBadge();
  };

  const handleSelectGeocodedCity = (city: GeocodedCity) => {
    const regionPart = city.admin1 ? `, ${city.admin1}` : '';
    const countryPart = city.country ? ` (${city.country})` : '';
    const fullLabel = `${city.name}${regionPart}${countryPart}`;

    setLatInput(city.latitude.toFixed(4));
    setLonInput(city.longitude.toFixed(4));
    setCustomLabel(fullLabel);
    setCityQuery(fullLabel);
    setShowDropdown(false);

    onSetManualLocation(city.latitude, city.longitude, fullLabel);
    triggerUpdatedBadge();
  };

  const nakedEyeCount = computedPasses.filter((p) => p.isVisuallyObservable).length;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85dvh] sm:max-h-[88vh] flex flex-col rounded-2xl bg-[#070d1f] border border-slate-700/90 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Fixed Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                {t.sightings.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {t.sightings.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
            title={t.sightings.closeModal}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4">
          {/* Location Configuration Card */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 space-y-3.5">
            {/* Active Location Banner + GPS Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-300">{t.sightings.active}</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                  {userLocation.label} ({userLocation.lat.toFixed(2)}°, {userLocation.lon.toFixed(2)}°) • QTH {userQth}
                </span>
                {justUpdatedFeedback && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    {t.sightings.locationUpdated}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onRequestGps}
                disabled={isLocating}
                className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isLocating ? t.sightings.locatingGps : t.sightings.useGps}</span>
              </button>
            </div>

            {/* City Search Autocomplete Dropdown (Open-Meteo Public Geocoding API) */}
            <div ref={dropdownRef} className="relative pt-2 border-t border-slate-800/80">
              <label className="block text-[11px] font-mono text-cyan-300 font-semibold mb-1.5">
                {t.sightings.searchCities}
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={cityQuery}
                  onFocus={() => {
                    if (citySuggestions.length > 0) setShowDropdown(true);
                  }}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder={t.sightings.searchPlaceholder}
                  className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none"
                />
                {isSearchingCities && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-3" />
                )}
                {!isSearchingCities && cityQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCityQuery('');
                      setCitySuggestions([]);
                      setShowDropdown(false);
                    }}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions Dropdown List */}
              {showDropdown && citySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl bg-slate-950 border border-cyan-500/50 shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800/80">
                  {citySuggestions.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectGeocodedCity(city)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-cyan-500/15 flex items-center justify-between gap-2 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {city.name}
                          {city.admin1 ? (
                            <span className="font-normal text-slate-400">, {city.admin1}</span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {city.country || ''}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-cyan-300 shrink-0">
                        {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick City Presets */}
            <div className="space-y-1.5">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                {t.sightings.quickCities}
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

            {/* Manual Coordinates Form */}
            <form
              onSubmit={handleApplyManualCoords}
              className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/80 items-end"
            >
              <div className="col-span-1 sm:col-span-3">
                <label className="block text-[10px] sm:text-[11px] font-mono text-slate-400 mb-1">
                  {t.sightings.latitude}
                </label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-3">
                <label className="block text-[10px] sm:text-[11px] font-mono text-slate-400 mb-1">
                  {t.sightings.longitude}
                </label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <label className="block text-[10px] sm:text-[11px] font-mono text-slate-400 mb-1">
                  {t.sightings.locationName}
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2 sm:py-1.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20"
                >
                  {t.sightings.saveCoordinates}
                </button>
              </div>
            </form>
          </div>

          {/* Collapsible Accordion for Upcoming Passes inside the Modal */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPassListOpen((prev) => !prev)}
              className="w-full p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {t.sightings.upcomingPassesList} ({computedPasses.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                      {t.sightings.nakedEyeCount.replace('{count}', String(nakedEyeCount))}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {t.sightings.tapToToggle.replace(
                      '{action}',
                      isPassListOpen ? t.sightings.collapse : t.sightings.expand
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400 shrink-0">
                <span>{isPassListOpen ? t.sightings.collapse : t.sightings.show}</span>
                {isPassListOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {isPassListOpen && (
              <div className="p-3.5 sm:p-5 pt-2 border-t border-slate-800/80 space-y-3">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="hidden sm:flex items-center gap-1 text-slate-400 font-semibold mr-1">
                      <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    </span>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono">
                      {(['all', 'iss', 'tiangong'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStationFilter(st)}
                          className={`px-2 py-1 rounded-md text-[11px] transition ${
                            stationFilter === st
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st === 'all' ? t.sightings.allStations : st === 'iss' ? 'ISS' : 'Tiangong'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono">
                      <button
                        type="button"
                        onClick={() => setVisibilityFilter('all')}
                        className={`px-2 py-1 rounded-md text-[11px] transition ${
                          visibilityFilter === 'all'
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.sightings.allPasses}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibilityFilter('naked_eye')}
                        className={`px-2 py-1 rounded-md text-[11px] transition flex items-center gap-1 ${
                          visibilityFilter === 'naked_eye'
                            ? 'bg-amber-500/25 text-amber-300 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{t.sightings.nakedEyeFilter.replace('{count}', String(nakedEyeCount))}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2 font-mono text-[11px]">
                    <select
                      value={hoursAhead}
                      onChange={(e) => setHoursAhead(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    >
                      <option value={24}>{t.sightings.hours24}</option>
                      <option value={48}>{t.sightings.hours48}</option>
                      <option value={72}>{t.sightings.hours72}</option>
                      <option value={120}>{t.sightings.days5}</option>
                    </select>

                    <select
                      value={minElevation}
                      onChange={(e) => setMinElevation(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    >
                      <option value={5}>{t.sightings.elevGte.replace('{deg}', '5')}</option>
                      <option value={10}>{t.sightings.elevGte.replace('{deg}', '10')}</option>
                      <option value={25}>{t.sightings.elevGte.replace('{deg}', '25')}</option>
                      <option value={45}>{t.sightings.elevGte.replace('{deg}', '45')}</option>
                    </select>
                  </div>
                </div>

                {computedPasses.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-xs text-slate-400">
                    {t.sightings.noPassesFound}
                  </div>
                ) : (
                  <>
                    {/* Mobile Compact Accordion Rows */}
                    <div className="space-y-2 md:hidden">
                      {computedPasses.map((p) => {
                        const isHigh = p.maxElevation >= 40;
                        const isItemOpen = expandedPassId === p.id;
                        const isScheduled = scheduledPassIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border font-mono text-xs overflow-hidden ${
                              p.isVisuallyObservable
                                ? 'bg-amber-950/15 border-amber-500/40'
                                : 'bg-slate-950/90 border-slate-800'
                            }`}
                          >
                            <div className="w-full p-2.5 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedPassId((prev) => (prev === p.id ? null : p.id))
                                }
                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                              >
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                                    p.stationId === 'iss'
                                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {p.stationName}
                                </span>
                                <span className="text-white font-bold text-[11px] truncate">
                                  {formatDate(p.aosTime, {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}{' '}
                                  {formatTime(p.aosTime)}
                                </span>
                                <span
                                  className={`font-bold text-[11px] ${
                                    isHigh ? 'text-emerald-300' : 'text-cyan-300'
                                  }`}
                                >
                                  {p.maxElevation.toFixed(0)}°
                                </span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {p.isVisuallyObservable && (
                                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                <span className="text-[10px] text-cyan-400">
                                  {formatTimeUntil(p.aosTime)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onTogglePassReminder(p)}
                                  className={`p-1.5 rounded-lg border transition ${
                                    isScheduled
                                      ? 'bg-amber-500/25 border-amber-400/60 text-amber-300'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                  title={t.sightings.notifyMePush}
                                >
                                  {isScheduled ? (
                                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                                  ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {isItemOpen && (
                              <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/80 space-y-2">
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                  <div className="bg-slate-900/80 p-1.5 rounded-lg">
                                    <div className="text-[10px] text-slate-400">{t.sightings.riseAos}</div>
                                    <div className="text-white font-bold">
                                      {formatTime(p.aosTime)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {Math.round(p.aosAzimuth)}° ({getCompassDirection(p.aosAzimuth)})
                                    </div>
                                  </div>

                                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                                    <div className="text-[10px] text-slate-400">{t.sightings.peak}</div>
                                    <div
                                      className={`font-bold text-sm ${
                                        isHigh ? 'text-emerald-300' : 'text-cyan-300'
                                      }`}
                                    >
                                      {p.maxElevation.toFixed(1)}°
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {Math.floor(p.durationSeconds / 60)}m {p.durationSeconds % 60}s
                                    </div>
                                  </div>

                                  <div className="bg-slate-900/80 p-1.5 rounded-lg">
                                    <div className="text-[10px] text-slate-400">{t.sightings.setLos}</div>
                                    <div className="text-white font-bold">
                                      {formatTime(p.losTime)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {Math.round(p.losAzimuth)}° ({getCompassDirection(p.losAzimuth)})
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-slate-900/95 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                            <th className="py-2.5 px-3">{t.passes.station}</th>
                            <th className="py-2.5 px-3">{t.sightings.dateAndCountdown}</th>
                            <th className="py-2.5 px-3">{t.sightings.riseAos}</th>
                            <th className="py-2.5 px-3">{t.passes.peakMaxEl}</th>
                            <th className="py-2.5 px-3">{t.sightings.setLos}</th>
                            <th className="py-2.5 px-3">{t.passes.duration}</th>
                            <th className="py-2.5 px-3">{t.sightings.visibility}</th>
                            <th className="py-2.5 px-3 text-right">{t.passes.notification}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {computedPasses.map((p) => {
                            const isHigh = p.maxElevation >= 40;
                            const isScheduled = scheduledPassIds.includes(p.id);
                            return (
                              <tr
                                key={p.id}
                                className={`transition ${
                                  p.isVisuallyObservable
                                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                    : 'hover:bg-slate-900/60'
                                }`}
                              >
                                <td className="py-2.5 px-3 font-bold">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
                                      p.stationId === 'iss'
                                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {p.stationName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="text-white font-semibold">
                                    {formatDate(p.aosTime, {
                                      weekday: 'short',
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </div>
                                  <div className="text-[11px] text-cyan-400">
                                    {formatTimeUntil(p.aosTime)}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="text-slate-100 font-semibold">
                                    {formatTime(p.aosTime)}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Az {Math.round(p.aosAzimuth)}° ({getCompassDirection(p.aosAzimuth)})
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
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
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {getCompassDirection(p.maxAzimuth)}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="text-slate-200">
                                    {formatTime(p.losTime)}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Az {Math.round(p.losAzimuth)}° ({getCompassDirection(p.losAzimuth)})
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  {Math.floor(p.durationSeconds / 60)}m {p.durationSeconds % 60}s
                                </td>
                                <td className="py-2.5 px-3">
                                  {p.skyQuality === 'naked_eye' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold text-[11px]">
                                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{t.common.nakedEye}</span>
                                    </span>
                                  ) : p.skyQuality === 'daylight_or_bright_twilight' ? (
                                    <span className="inline-flex items-center gap-1 text-sky-300 text-[11px]">
                                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{t.passes.daylightRadio}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>{t.passes.eclipseRadio}</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => onTogglePassReminder(p)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition ${
                                      isScheduled
                                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                                    }`}
                                    title={
                                      isScheduled
                                        ? t.passes.removeReminderTitle
                                        : t.passes.setReminderTitle
                                    }
                                  >
                                    {isScheduled ? (
                                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                                    ) : (
                                      <Bell className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Fixed Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNotificationsModal();
            }}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-mono font-bold flex items-center justify-center gap-1.5 transition"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.sightings.pushSettings}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            {t.sightings.close}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
