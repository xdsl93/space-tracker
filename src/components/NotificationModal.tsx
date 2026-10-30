import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  Check,
  Clock,
  Compass,
  Eye,
  Navigation,
  Radio,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  NotificationPermissionState,
  NotificationPreferences,
  PassAlertNotification,
  SatellitePass,
  StationId,
  UserLocation,
} from '../types/station';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: NotificationPermissionState;
  preferences: NotificationPreferences;
  scheduledPassIds: string[];
  upcomingPasses: SatellitePass[];
  recentAlerts: PassAlertNotification[];
  lastDispatchDiagnostic?: string | null;
  userLocation: UserLocation;
  onToggleEnabled: () => Promise<boolean>;
  onUpdatePreferences: (patch: Partial<NotificationPreferences>) => void;
  onTogglePassReminder: (pass: SatellitePass) => Promise<boolean>;
  onSendTest: () => Promise<boolean>;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  permission,
  preferences,
  scheduledPassIds,
  upcomingPasses,
  recentAlerts,
  lastDispatchDiagnostic,
  userLocation,
  onToggleEnabled,
  onUpdatePreferences,
  onTogglePassReminder,
  onSendTest,
}) => {
  const { t, formatTime } = useLanguage();
  const [testSentFeedback, setTestSentFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const scheduledPasses = upcomingPasses.filter((p) => scheduledPassIds.includes(p.id));

  const handleTestClick = async () => {
    await onSendTest();
    setTestSentFeedback(true);
    setTimeout(() => setTestSentFeedback(false), 3000);
  };

  const toggleStation = (stId: StationId) => {
    onUpdatePreferences({
      stations: {
        ...preferences.stations,
        [stId]: !preferences.stations[stId],
      },
    });
  };

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
        className="w-full max-w-2xl max-h-[86dvh] sm:max-h-[88vh] flex flex-col rounded-2xl bg-[#070d1f] border border-slate-700/90 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-400/40 shrink-0">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                {t.notifications.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {t.notifications.subtitle.replace('{location}', userLocation.label)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
            title={t.notifications.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4">
          {/* Master Enable Banner + Browser Permission Status */}
          <div
            className={`rounded-2xl p-4 border transition ${
              preferences.enabled
                ? 'bg-emerald-950/25 border-emerald-500/40'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {t.notifications.statusTitle}
                  </span>
                  {preferences.enabled ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                      {t.notifications.active}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono">
                      {t.notifications.disabled}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">
                    {t.notifications.systemPermission}{' '}
                    <strong
                      className={
                        permission === 'granted'
                          ? 'text-emerald-400'
                          : permission === 'denied'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }
                    >
                      {permission === 'granted'
                        ? t.notifications.permGranted
                        : permission === 'denied'
                        ? t.notifications.permDenied
                        : permission === 'unsupported'
                        ? t.notifications.permUnsupported
                        : t.notifications.permPrompt}
                    </strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t.notifications.masterDescription}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onToggleEnabled}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md ${
                    preferences.enabled
                      ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {preferences.enabled ? (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      <span>{t.notifications.turnOff}</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      <span>{t.notifications.turnOn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {permission === 'denied' && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2 text-[11px] text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>{t.notifications.deniedWarning}</div>
              </div>
            )}

            {lastDispatchDiagnostic && permission !== 'denied' && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-start gap-2 text-[11px] text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>{t.notifications.diagnosticPrefix}</strong> {lastDispatchDiagnostic} {t.notifications.diagnosticFallback}
                </div>
              </div>
            )}
          </div>

          {/* Condition & Proximity Configuration */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-cyan-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{t.notifications.conditionsSection}</span>
            </h3>

            {/* 1. Station Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t.notifications.monitoredStations}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['iss', 'tiangong'] as StationId[]).map((stId) => {
                  const active = preferences.stations[stId];
                  const label = stId === 'iss' ? 'ISS (Zarya)' : 'Tiangong (CSS)';
                  return (
                    <button
                      key={stId}
                      type="button"
                      onClick={() => toggleStation(stId)}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between transition ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Optical Visibility Mode (Naked Eye vs All Radio/Daylight) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t.notifications.visibilityFilterLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ onlyVisuallyObservable: false })}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    !preferences.onlyVisuallyObservable
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">{t.notifications.allPassesOpt}</div>
                    <div className="text-[10px] text-slate-400">
                      {t.notifications.allPassesDesc}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ onlyVisuallyObservable: true })}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    preferences.onlyVisuallyObservable
                      ? 'bg-amber-500/15 border-amber-400/60 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>{t.notifications.nakedEyeOnlyOpt}</span>
                      <Eye className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {t.notifications.nakedEyeOnlyDesc}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Proximity Distance & Minimum Elevation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.notifications.minElevationLabel}</span>
                </label>
                <select
                  value={preferences.minElevationDeg}
                  onChange={(e) =>
                    onUpdatePreferences({ minElevationDeg: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value={5}>{t.notifications.elevOption5}</option>
                  <option value={10}>{t.notifications.elevOption10}</option>
                  <option value={25}>{t.notifications.elevOption25}</option>
                  <option value={45}>{t.notifications.elevOption45}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t.notifications.maxDistanceLabel}</span>
                </label>
                <select
                  value={preferences.maxDistanceKm}
                  onChange={(e) =>
                    onUpdatePreferences({ maxDistanceKm: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value={1000}>{t.notifications.dist1000}</option>
                  <option value={1500}>{t.notifications.dist1500}</option>
                  <option value={2000}>{t.notifications.dist2000}</option>
                  <option value={2500}>{t.notifications.dist2500}</option>
                </select>
              </div>
            </div>

            {/* 4. Timing: Pre-pass Warning + Immediate Entry + Audio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.notifications.prePassWarning}</span>
                </label>
                <select
                  value={preferences.notifyOnPrePassMinutes}
                  onChange={(e) =>
                    onUpdatePreferences({ notifyOnPrePassMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                >
                  <option value={0}>{t.notifications.prePass0}</option>
                  <option value={5}>{t.notifications.prePass5}</option>
                  <option value={10}>{t.notifications.prePass10}</option>
                  <option value={15}>{t.notifications.prePass15}</option>
                </select>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({
                      notifyOnEnterVisibility: !preferences.notifyOnEnterVisibility,
                    })
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between transition ${
                    preferences.notifyOnEnterVisibility
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{t.notifications.liveVisibilityPush}</span>
                  <span className="font-bold">
                    {preferences.notifyOnEnterVisibility ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ soundEnabled: !preferences.soundEnabled })
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center justify-between transition ${
                    preferences.soundEnabled
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {preferences.soundEnabled ? (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{t.notifications.telemetrySound}</span>
                  </span>
                  <span className="font-bold">{preferences.soundEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scheduled Individual Pass Reminders */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>
                  {t.notifications.scheduledReminders.replace('{count}', String(scheduledPasses.length))}
                </span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {t.notifications.scheduledHint}
              </span>
            </div>

            {scheduledPasses.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 font-mono">
                {t.notifications.noScheduled}
              </div>
            ) : (
              <div className="space-y-1.5">
                {scheduledPasses.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-bold text-[10px]">
                        {p.stationName}
                      </span>
                      <span className="text-white font-semibold truncate">
                        {formatTime(p.aosTime)}{' '}
                        (Max {p.maxElevation.toFixed(0)}°)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePassReminder(p)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 transition"
                      title={t.notifications.removeReminder}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Alerts Log */}
          {recentAlerts.length > 0 && (
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-300 font-mono">
                {t.notifications.recentAlerts.replace('{count}', String(recentAlerts.length))}
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {recentAlerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[11px] font-mono"
                  >
                    <div className="flex items-center justify-between text-cyan-300 font-bold">
                      <span>{a.title}</span>
                      <span className="text-[10px] text-slate-500">
                        {formatTime(new Date(a.timestamp), { second: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{a.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Test Notification Button */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 border border-amber-400/50 text-amber-200 font-mono font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            {testSentFeedback ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">{t.notifications.testSent}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.notifications.sendTestNow}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            {t.notifications.close}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
