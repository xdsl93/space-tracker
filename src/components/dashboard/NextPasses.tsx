import {
  Bell,
  BellRing,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  MapPin,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import React, { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SatellitePass, UserLocation } from '../../types/station';

interface NextPassesProps {
  passes: SatellitePass[];
  userLocation: UserLocation;
  scheduledPassIds: string[];
  notificationsEnabled: boolean;
  onTogglePassReminder: (pass: SatellitePass) => Promise<boolean>;
  onOpenSightingsModal: () => void;
  onOpenNotificationsModal: () => void;
}

export const NextPasses: React.FC<NextPassesProps> = ({
  passes,
  userLocation,
  scheduledPassIds,
  notificationsEnabled,
  onTogglePassReminder,
  onOpenSightingsModal,
  onOpenNotificationsModal,
}) => {
  const { t, formatTime, getCompassDirection } = useLanguage();
  // Collapsed by default on mobile (< 768px), expanded on desktop
  const [isMainListExpanded, setIsMainListExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  // Individual pass card accordion state on mobile (all collapsed by default)
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null);

  const nextPass = passes[0] || null;

  return (
    <div className="rounded-2xl bg-slate-900/85 border border-slate-800 overflow-hidden shadow-lg">
      {/* Main Accordion Header */}
      <div className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsMainListExpanded((prev) => !prev)}
          className="flex items-center justify-between gap-2.5 text-left w-full sm:w-auto flex-1"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 shrink-0">
              <CalendarClock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {t.passes.title24h}
                </h3>
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                  {passes.length}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                {nextPass ? (
                  <>
                    {t.passes.next} <strong className="text-white">{nextPass.stationName}</strong> {t.passes.at}{' '}
                    <strong className="text-cyan-300">
                      {formatTime(nextPass.aosTime)}
                    </strong>{' '}
                    (Max {nextPass.maxElevation.toFixed(0)}°)
                  </>
                ) : (
                  <>{t.passes.location} {userLocation.label}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400 shrink-0">
            <span className="hidden sm:inline">
              {isMainListExpanded ? t.passes.collapse : t.passes.expandList}
            </span>
            {isMainListExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Action Buttons: Push Notifications + Location & Extended Sightings Modal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNotificationsModal}
            className={`px-3.5 py-2 rounded-xl border font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              notificationsEnabled
                ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/60 text-amber-200'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {notificationsEnabled ? (
              <BellRing className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <span>{notificationsEnabled ? t.passes.pushActive : t.passes.enablePush}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSightingsModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-500/15"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{t.passes.changeLocationAndCalendar}</span>
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Expandable Accordion Body */}
      {isMainListExpanded && (
        <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 pt-2 border-t border-slate-800/80">
          {passes.length === 0 ? (
            <div className="p-5 text-center rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400">
              {t.passes.noPasses}
            </div>
          ) : (
            <>
              {/* Mobile Accordion List (Each pass is a compact row collapsed by default, tap to expand details) */}
              <div className="space-y-2 md:hidden">
                {passes.slice(0, 8).map((p) => {
                  const isHighPass = p.maxElevation >= 40;
                  const isItemOpen = expandedPassId === p.id;
                  const isScheduled = scheduledPassIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl bg-slate-950/90 border border-slate-800/90 overflow-hidden font-mono text-xs"
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
                            className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 ${
                              p.stationId === 'iss'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {p.stationName}
                          </span>
                          <span className="text-white font-bold">
                            {formatTime(p.aosTime)}
                          </span>
                          <span
                            className={`font-semibold ${
                              isHighPass ? 'text-emerald-300' : 'text-cyan-300'
                            }`}
                          >
                            Max {p.maxElevation.toFixed(0)}°
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.isVisuallyObservable ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold text-[9px]">
                              <Eye className="w-3 h-3 text-amber-400" />
                              <span>{t.common.visible}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">{t.common.radioOnly}</span>
                          )}

                          <button
                            type="button"
                            onClick={() => onTogglePassReminder(p)}
                            className={`p-1.5 rounded-lg border transition ${
                              isScheduled
                                ? 'bg-amber-500/25 border-amber-400/60 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
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
                              <Bell className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPassId((prev) => (prev === p.id ? null : p.id))
                            }
                            className="p-1 text-slate-400"
                          >
                            {isItemOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isItemOpen && (
                        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 text-center">
                          <div className="bg-slate-900/70 p-1.5 rounded-lg">
                            <div className="text-[10px] text-slate-400">{t.passes.rise}</div>
                            <div className="text-white font-bold">
                              {formatTime(p.aosTime)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {Math.round(p.aosAzimuth)}° ({getCompassDirection(p.aosAzimuth)})
                            </div>
                          </div>

                          <div className="bg-slate-900/70 p-1.5 rounded-lg border border-slate-800">
                            <div className="text-[10px] text-slate-400">{t.passes.peak}</div>
                            <div
                              className={`font-bold text-sm ${
                                isHighPass ? 'text-emerald-300' : 'text-cyan-300'
                              }`}
                            >
                              {p.maxElevation.toFixed(1)}°
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {Math.floor(p.durationSeconds / 60)}m {p.durationSeconds % 60}s
                            </div>
                          </div>

                          <div className="bg-slate-900/70 p-1.5 rounded-lg">
                            <div className="text-[10px] text-slate-400">{t.passes.set}</div>
                            <div className="text-white font-bold">
                              {formatTime(p.losTime)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {Math.round(p.losAzimuth)}° ({getCompassDirection(p.losAzimuth)})
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">{t.passes.station}</th>
                      <th className="py-2.5 px-3">{t.passes.riseAos}</th>
                      <th className="py-2.5 px-3">{t.passes.peakMaxEl}</th>
                      <th className="py-2.5 px-3">{t.passes.setLos}</th>
                      <th className="py-2.5 px-3">{t.passes.duration}</th>
                      <th className="py-2.5 px-3">{t.passes.sightingCondition}</th>
                      <th className="py-2.5 px-3 text-right">{t.passes.notification}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {passes.slice(0, 8).map((p) => {
                      const isHighPass = p.maxElevation >= 40;
                      const isScheduled = scheduledPassIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-800/40 transition text-slate-200"
                        >
                          <td className="py-3 px-3 font-bold">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${
                                p.stationId === 'iss'
                                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {p.stationName}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-white font-semibold">
                              {formatTime(p.aosTime, { second: '2-digit' })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Az: {Math.round(p.aosAzimuth)}° ({getCompassDirection(p.aosAzimuth)})
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <Compass
                                className={`w-3.5 h-3.5 ${
                                  isHighPass ? 'text-emerald-400' : 'text-cyan-400'
                                }`}
                              />
                              <span
                                className={`font-bold text-sm ${
                                  isHighPass ? 'text-emerald-300' : 'text-cyan-300'
                                }`}
                              >
                                {p.maxElevation.toFixed(1)}°
                              </span>
                              {isHighPass && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                  {t.passes.excellent}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {formatTime(p.maxElTime)}{' '}
                              • Az {Math.round(p.maxAzimuth)}° ({getCompassDirection(p.maxAzimuth)})
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-200">
                              {formatTime(p.losTime, { second: '2-digit' })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Az: {Math.round(p.losAzimuth)}° ({getCompassDirection(p.losAzimuth)})
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {Math.floor(p.durationSeconds / 60)}m {p.durationSeconds % 60}s
                          </td>
                          <td className="py-3 px-3">
                            {p.isVisuallyObservable ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.passes.nakedEyeVisible}</span>
                              </span>
                            ) : p.isSunlitPass ? (
                              <span className="inline-flex items-center gap-1 text-sky-300">
                                <Sun className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.passes.daylightRadio}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{t.passes.eclipseRadio}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => onTogglePassReminder(p)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
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
                                <>
                                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{t.passes.reminderActive}</span>
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{t.passes.remindMe}</span>
                                </>
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
  );
};
