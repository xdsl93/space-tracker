import {
  Activity,
  Bell,
  BellRing,
  CalendarClock,
  MapPin,
  Radio,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './components/Header';
import { NotificationModal } from './components/NotificationModal';
import { SightingsModal } from './components/SightingsModal';
import { ViewportSwitcher } from './components/ViewportSwitcher';
import { NextPasses } from './components/dashboard/NextPasses';
import { RadioPanel } from './components/dashboard/RadioPanel';
import { TelemetryGrid } from './components/dashboard/TelemetryGrid';
import { usePassNotifications } from './hooks/usePassNotifications';
import { useSpaceStations } from './hooks/useSpaceStations';
import { useUserLocation } from './hooks/useUserLocation';
import { useLanguage } from './i18n/LanguageContext';
import { StationId } from './types/station';

type DashboardTab = 'telemetry' | 'passes' | 'radio';

export function App() {
  const { t, language, formatTime } = useLanguage();
  const [selectedStationId, setSelectedStationId] = useState<StationId>('iss');
  const [activeTab, setActiveTab] = useState<DashboardTab>('telemetry');
  const [isSightingsModalOpen, setIsSightingsModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);

  const {
    location: userLocation,
    isLocating,
    requestGpsLocation,
    setManualLocation,
  } = useUserLocation();

  const {
    now,
    tles,
    stations,
    upcomingPasses,
    isRefreshingTle,
    refreshTles,
  } = useSpaceStations(userLocation);

  const {
    permission,
    preferences,
    scheduledPassIds,
    activeToast,
    recentAlerts,
    lastDispatchDiagnostic,
    updatePreferences,
    toggleNotificationsEnabled,
    togglePassReminder,
    sendTestNotification,
    dismissToast,
  } = usePassNotifications(stations, upcomingPasses, userLocation, now, language);

  const activeStation = stations[selectedStationId];
  const activeTle = tles[selectedStationId];

  const nakedEyePassesCount = upcomingPasses.filter((p) => p.isVisuallyObservable).length;
  const activeScheduledCount = upcomingPasses.filter((p) =>
    scheduledPassIds.includes(p.id)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#03060f] text-slate-100">
      {/* Top Sticky Navigation & Controls */}
      <Header
        now={now}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
        userLocation={userLocation}
        isRefreshingTle={isRefreshingTle}
        onRefreshTles={() => refreshTles(true)}
        onOpenSightingsModal={() => setIsSightingsModalOpen(true)}
        onOpenNotificationsModal={() => setIsNotificationsModalOpen(true)}
        notificationsEnabled={preferences.enabled}
        scheduledRemindersCount={activeScheduledCount}
        upcomingCount={upcomingPasses.length}
      />

      {/* Main Viewport: 3D Globe <-> 2D Sinusoidal Map with Day/Night & User Marker */}
      <ViewportSwitcher
        now={now}
        stations={stations}
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
        userLocation={userLocation}
      />

      {/* Sticky Dashboard Section Tabs Bar (Prevents vertical overload on mobile & desktop!) */}
      <div className="sticky top-[88px] lg:top-[57px] z-20 bg-[#050918]/95 backdrop-blur-xl border-b border-slate-800 px-2.5 sm:px-6 py-2 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* 3 Main Tabs */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-2 w-full sm:w-auto bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{t.tabs.telemetry}</span>
            </button>

            <button
              onClick={() => setActiveTab('passes')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'passes'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{t.tabs.passes}</span>
              <span
                className={`hidden xs:inline-block px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === 'passes'
                    ? 'bg-slate-950/25 text-slate-950'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {upcomingPasses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('radio')}
              className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'radio'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{t.tabs.radio}</span>
            </button>
          </div>

          {/* Quick Location & Sightings / Notifications Triggers on Desktop */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>
              {t.tabs.observer} <strong className="text-emerald-300">{userLocation.label}</strong>
              {nakedEyePassesCount > 0 && (
                <span className="ml-2 text-amber-300">
                  {t.tabs.nakedEyePassesCount.replace('{count}', String(nakedEyePassesCount))}
                </span>
              )}
            </span>
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
                preferences.enabled
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {preferences.enabled ? (
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{preferences.enabled ? t.tabs.notificationsOn : t.tabs.pushNotifications}</span>
            </button>
            <button
              onClick={() => setIsSightingsModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.tabs.changeLocation}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabbed Lower Dashboard Content */}
      <main
        id="dashboard-section"
        className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-6"
      >
        {activeTab === 'telemetry' && (
          <TelemetryGrid
            station={activeStation}
            allStations={stations}
            selectedStationId={selectedStationId}
            onSelectStation={setSelectedStationId}
            tle={activeTle}
            userLocation={userLocation}
          />
        )}

        {activeTab === 'passes' && (
          <NextPasses
            passes={upcomingPasses}
            userLocation={userLocation}
            scheduledPassIds={scheduledPassIds}
            notificationsEnabled={preferences.enabled}
            onTogglePassReminder={togglePassReminder}
            onOpenSightingsModal={() => setIsSightingsModalOpen(true)}
            onOpenNotificationsModal={() => setIsNotificationsModalOpen(true)}
          />
        )}

        {activeTab === 'radio' && (
          <RadioPanel stations={stations} selectedStationId={selectedStationId} />
        )}
      </main>

      {/* Live Push Notification In-App Popup Banner (Rendered via Portal at z-[10050] so it sits above all modals!) */}
      {activeToast &&
        createPortal(
          <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[420px] z-[10050] rounded-2xl bg-slate-950/95 backdrop-blur-xl border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)] p-4 font-mono text-xs">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-amber-500/25 border border-amber-400/60 shrink-0 mt-0.5">
                  <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[9px] uppercase">
                      {t.toast.pushNotification}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(new Date(activeToast.timestamp), { second: '2-digit' })}
                    </span>
                  </div>
                  <div className="font-bold text-white text-xs sm:text-sm mt-1">
                    {activeToast.title}
                  </div>
                  <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                    {activeToast.body}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStationId(activeToast.stationId);
                        setIsNotificationsModalOpen(false);
                        setIsSightingsModalOpen(false);
                        dismissToast();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition shadow"
                    >
                      {t.toast.trackStation.replace('{name}', activeToast.stationName)}
                    </button>
                    <button
                      type="button"
                      onClick={dismissToast}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition"
                    >
                      {t.toast.close}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={dismissToast}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                title={t.toast.closeAlert}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Interactive Sightings & Manual Location Modal */}
      <SightingsModal
        isOpen={isSightingsModalOpen}
        onClose={() => setIsSightingsModalOpen(false)}
        tles={tles}
        userLocation={userLocation}
        isLocating={isLocating}
        onRequestGps={requestGpsLocation}
        onSetManualLocation={setManualLocation}
        scheduledPassIds={scheduledPassIds}
        onTogglePassReminder={togglePassReminder}
        onOpenNotificationsModal={() => setIsNotificationsModalOpen(true)}
      />

      {/* Push Notifications & Proximity Alerts Modal */}
      <NotificationModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        permission={permission}
        preferences={preferences}
        scheduledPassIds={scheduledPassIds}
        upcomingPasses={upcomingPasses}
        recentAlerts={recentAlerts}
        lastDispatchDiagnostic={lastDispatchDiagnostic}
        userLocation={userLocation}
        onToggleEnabled={toggleNotificationsEnabled}
        onUpdatePreferences={updatePreferences}
        onTogglePassReminder={togglePassReminder}
        onSendTest={sendTestNotification}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#02040a] py-4 px-4 text-center text-[11px] sm:text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-500" />
            <span>{t.footer.engine}</span>
          </div>
          <div>{t.footer.copy}</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
