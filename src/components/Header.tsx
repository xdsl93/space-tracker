import {
  Bell,
  BellRing,
  CalendarClock,
  Clock,
  Download,
  Languages,
  MapPin,
  RefreshCw,
  Satellite,
  Settings2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { latLonToMaidenhead } from '../services/orbitalEngine';
import { StationId, StationTelemetry, UserLocation } from '../types/station';

interface HeaderProps {
  now: Date;
  stations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
  onSelectStation: (id: StationId) => void;
  userLocation: UserLocation;
  isRefreshingTle: boolean;
  onRefreshTles: () => void;
  onOpenSightingsModal: () => void;
  onOpenNotificationsModal: () => void;
  notificationsEnabled: boolean;
  scheduledRemindersCount: number;
  upcomingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  now,
  stations,
  selectedStationId,
  onSelectStation,
  userLocation,
  isRefreshingTle,
  onRefreshTles,
  onOpenSightingsModal,
  onOpenNotificationsModal,
  notificationsEnabled,
  scheduledRemindersCount,
  upcomingCount,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const userQth = latLonToMaidenhead(userLocation.lat, userLocation.lon);

  return (
    <header className="sticky top-0 z-30 bg-[#050918]/95 backdrop-blur-xl border-b border-slate-800/80 px-2.5 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Top Row: Brand Logo + Quick Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner">
              <Satellite className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                  {t.common.appName}<span className="text-cyan-400">TRACK</span>
                </h1>
                <span className="hidden xs:inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded">
                  {t.common.appTagline}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                {t.common.appSubtitle}
              </p>
            </div>
          </div>

          {/* Desktop Station Selector (hidden on small screens, shown in Row 2 on mobile) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {(['iss', 'tiangong'] as StationId[]).map((id) => {
              const st = stations[id];
              const active = selectedStationId === id;
              return (
                <button
                  key={id}
                  onClick={() => onSelectStation(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-slate-800 text-white shadow border border-slate-600/80'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: st.color }}
                  />
                  <span>{st.shortName}</span>
                  {st.isAboveHorizon && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/40 animate-pulse">
                      {t.common.inSight}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Language, Push Notifications, Sightings Modal, Location QTH, UTC, Refresh, Install */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] sm:text-xs font-mono font-bold text-cyan-300 transition"
              title={language === 'it' ? 'Switch to English' : 'Passa alla lingua italiana'}
            >
              <Languages className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{language.toUpperCase()}</span>
            </button>

            {/* Push Notifications Button */}
            <button
              onClick={onOpenNotificationsModal}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono font-bold transition shadow-sm ${
                notificationsEnabled
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/60 text-amber-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
              title={t.header.notificationsTitle}
            >
              {notificationsEnabled ? (
                <BellRing className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              ) : (
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
              )}
              <span className="hidden md:inline">
                {notificationsEnabled ? t.header.alertsOn : t.header.notifications}
              </span>
              {scheduledRemindersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/25 text-amber-200 text-[10px]">
                  {scheduledRemindersCount}
                </span>
              )}
              {notificationsEnabled && scheduledRemindersCount === 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Prossimi Avvistamenti Button */}
            <button
              onClick={onOpenSightingsModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/50 text-[11px] sm:text-xs font-mono font-bold text-cyan-200 transition shadow-sm"
              title={t.header.sightingsTitle}
            >
              <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">{t.header.sightings}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/25 text-cyan-200 text-[10px]">
                {upcomingCount}
              </span>
            </button>

            {/* User Location & QTH Button */}
            <button
              onClick={onOpenSightingsModal}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-[11px] sm:text-xs font-mono text-emerald-200 transition"
              title={t.header.locationTitle}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden md:inline">
                {userLocation.lat.toFixed(1)}°, {userLocation.lon.toFixed(1)}°
              </span>
              <span className="text-emerald-400 font-bold">{userQth.substring(0, 4)}</span>
              <Settings2 className="w-3 h-3 text-emerald-400/80 hidden sm:inline" />
            </button>

            {/* UTC Clock (Desktop) */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{now.toISOString().substring(11, 19)} UTC</span>
            </div>

            {/* Refresh TLE Button */}
            <button
              onClick={onRefreshTles}
              disabled={isRefreshingTle}
              title={t.header.refreshTleTitle}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 ${
                  isRefreshingTle ? 'animate-spin' : ''
                }`}
              />
            </button>

            {/* Install PWA Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPwa}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.header.installApp}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Row 2: Full-Width Segmented Station Selector (ISS vs Tiangong) */}
        <div className="flex lg:hidden items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
          {(['iss', 'tiangong'] as StationId[]).map((id) => {
            const st = stations[id];
            const active = selectedStationId === id;
            return (
              <button
                key={id}
                onClick={() => onSelectStation(id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  active
                    ? 'bg-slate-800 text-white shadow border border-slate-600/80'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <span className="truncate">{st.shortName}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {Math.round(st.altKm)}km
                </span>
                {st.isAboveHorizon && (
                  <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] border border-emerald-500/40 animate-pulse">
                    {t.common.live}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
