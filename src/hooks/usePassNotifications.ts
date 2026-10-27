import { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../i18n/types';
import { getSunElevationAtLocation } from '../services/orbitalEngine';
import {
  NotificationPermissionState,
  NotificationPreferences,
  PassAlertNotification,
  SatellitePass,
  StationId,
  StationTelemetry,
  UserLocation,
} from '../types/station';

const PREFS_STORAGE_KEY = 'orbitaltrack_notification_prefs_v1';
const SCHEDULED_PASSES_KEY = 'orbitaltrack_scheduled_passes_v1';
const FIRED_ALERTS_KEY = 'orbitaltrack_fired_alerts_v1';

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: false,
  stations: {
    iss: true,
    tiangong: true,
  },
  onlyVisuallyObservable: false,
  minElevationDeg: 10,
  maxDistanceKm: 2000,
  notifyOnEnterVisibility: true,
  notifyOnPrePassMinutes: 10,
  soundEnabled: true,
};

function azimuthToCompass(deg: number, lang: Language = 'it'): string {
  const dirsIt = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const dirsEn = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirs = lang === 'it' ? dirsIt : dirsEn;
  return dirs[Math.round(deg / 45) % 8];
}

function getBrowserPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

/**
 * Plays a short, pleasant double-beep satellite telemetry chime via Web Audio API
 */
function playSatelliteAlertBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1046.5, now, 0.14); // C6
    playTone(1318.5, now + 0.18, 0.24); // E6
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

export interface DispatchResult {
  nativeDispatched: boolean;
  reason?: string;
}

/**
 * Dispatches a native OS / Browser Push Notification.
 * Uses direct `new Notification()` first when the page is open (compatible with standard Options),
 * and falls back to ServiceWorker `showNotification()` when required (e.g. mobile Android PWA).
 */
async function dispatchBrowserNotification(
  title: string,
  body: string,
  tag: string,
  lang: Language = 'it'
): Promise<DispatchResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      nativeDispatched: false,
      reason:
        lang === 'it'
          ? 'Web Notification API non supportata dal browser.'
          : 'Web Notification API not supported by browser.',
    };
  }

  // Note: Notification API requires a Secure Context (HTTPS or localhost)
  if (!window.isSecureContext) {
    return {
      nativeDispatched: false,
      reason:
        lang === 'it'
          ? 'Contesto non sicuro (HTTP su IP di rete). Per le notifiche native di sistema apri http://localhost:5173/ oppure usa HTTPS.'
          : 'Insecure context (HTTP over network IP). For native system notifications, use http://localhost:5173/ or HTTPS.',
    };
  }

  if (Notification.permission !== 'granted') {
    return {
      nativeDispatched: false,
      reason:
        lang === 'it'
          ? `Permesso notifiche browser non concesso (stato: ${Notification.permission}).`
          : `Browser notification permission not granted (state: ${Notification.permission}).`,
    };
  }

  // Standard NotificationOptions (do NOT pass ServiceWorker-only props like renotify/vibrate to new Notification(),
  // as Chrome/Edge desktop may reject or suppress them)
  const standardOptions: NotificationOptions = {
    body,
    tag,
    requireInteraction: false,
  };

  // 1. Try direct Desktop/Browser Notification constructor first
  try {
    const n = new Notification(title, standardOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return { nativeDispatched: true };
  } catch {
    // On Android Chrome, `new Notification()` throws a TypeError and requires ServiceWorkerRegistration.showNotification
  }

  // 2. Fallback to ServiceWorkerRegistration.showNotification
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, standardOptions);
        return { nativeDispatched: true };
      }
    }
  } catch (err) {
    return {
      nativeDispatched: false,
      reason:
        err instanceof Error
          ? err.message
          : lang === 'it'
          ? 'Errore invio notifica ServiceWorker.'
          : 'Error sending ServiceWorker notification.',
    };
  }

  return {
    nativeDispatched: false,
    reason:
      lang === 'it'
        ? 'Impossibile invocare Notification API o Service Worker.'
        : 'Unable to invoke Notification API or Service Worker.',
  };
}

export function usePassNotifications(
  stations: Record<StationId, StationTelemetry>,
  upcomingPasses: SatellitePass[],
  userLocation: UserLocation,
  now: Date,
  language: Language = 'it'
) {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    getBrowserPermissionState
  );

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PREFS,
          ...parsed,
          stations: {
            ...DEFAULT_PREFS.stations,
            ...(parsed.stations || {}),
          },
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PREFS;
  });

  const [scheduledPassIds, setScheduledPassIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SCHEDULED_PASSES_KEY);
      if (raw) {
        return JSON.parse(raw) as string[];
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeToast, setActiveToast] = useState<PassAlertNotification | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<PassAlertNotification[]>([]);
  const [lastDispatchDiagnostic, setLastDispatchDiagnostic] = useState<string | null>(null);

  // Map of alertKey -> timestamp(ms) when it was fired, to prevent duplicate notifications
  const firedAlertsRef = useRef<Record<string, number>>(
    (() => {
      try {
        const raw = localStorage.getItem(FIRED_ALERTS_KEY);
        if (raw) return JSON.parse(raw) as Record<string, number>;
      } catch {
        // ignore
      }
      return {};
    })()
  );

  const recordFiredAlert = useCallback((key: string, timestampMs: number) => {
    const cutoff = timestampMs - 24 * 3600 * 1000;
    const nextMap: Record<string, number> = {};
    for (const [k, ts] of Object.entries(firedAlertsRef.current)) {
      if (ts > cutoff) nextMap[k] = ts;
    }
    nextMap[key] = timestampMs;
    firedAlertsRef.current = nextMap;
    try {
      localStorage.setItem(FIRED_ALERTS_KEY, JSON.stringify(nextMap));
    } catch {
      // ignore
    }
  }, []);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  // Persist scheduled pass IDs
  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULED_PASSES_KEY, JSON.stringify(scheduledPassIds));
    } catch {
      // ignore
    }
  }, [scheduledPassIds]);

  // Sync permission state on window focus
  useEffect(() => {
    const syncPerm = () => setPermission(getBrowserPermissionState());
    window.addEventListener('focus', syncPerm);
    return () => window.removeEventListener('focus', syncPerm);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    try {
      // Support both Promise-based and legacy callback-based Notification.requestPermission
      let result: NotificationPermission = 'default';
      const maybePromise = Notification.requestPermission((res) => {
        result = res;
      });
      if (maybePromise && typeof maybePromise.then === 'function') {
        result = await maybePromise;
      }
      const state = result as NotificationPermissionState;
      setPermission(state);
      if (state === 'granted') {
        setPreferences((prev) => ({ ...prev, enabled: true }));
      }
      return state;
    } catch {
      const fallback = getBrowserPermissionState();
      setPermission(fallback);
      return fallback;
    }
  }, []);

  const updatePreferences = useCallback((patch: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...patch,
      stations: patch.stations ? { ...prev.stations, ...patch.stations } : prev.stations,
    }));
  }, []);

  const triggerAlert = useCallback(
    async (alert: PassAlertNotification, playSound: boolean): Promise<DispatchResult> => {
      setActiveToast(alert);
      setRecentAlerts((prev) => [alert, ...prev.slice(0, 14)]);
      if (playSound) {
        playSatelliteAlertBeep();
      }
      const res = await dispatchBrowserNotification(
        alert.title,
        alert.body,
        alert.id,
        language
      );
      if (!res.nativeDispatched && res.reason) {
        setLastDispatchDiagnostic(res.reason);
      } else {
        setLastDispatchDiagnostic(null);
      }
      return res;
    },
    [language]
  );

  const toggleNotificationsEnabled = useCallback(async () => {
    if (!preferences.enabled) {
      let currentPerm = getBrowserPermissionState();
      if (currentPerm !== 'granted') {
        currentPerm = await requestPermission();
      }
      // Enable in-app & push notifications even if OS permission is blocked/unsupported
      setPreferences((prev) => ({ ...prev, enabled: true }));
      return currentPerm === 'granted';
    } else {
      setPreferences((prev) => ({ ...prev, enabled: false }));
      return false;
    }
  }, [preferences.enabled, requestPermission]);

  const togglePassReminder = useCallback(
    async (pass: SatellitePass) => {
      const exists = scheduledPassIds.includes(pass.id);
      if (exists) {
        setScheduledPassIds((prev) => prev.filter((id) => id !== pass.id));
        return false;
      }

      if (permission !== 'granted') {
        await requestPermission();
      }
      setPreferences((prev) => ({ ...prev, enabled: true }));
      setScheduledPassIds((prev) => [...prev, pass.id]);
      return true;
    },
    [scheduledPassIds, permission, requestPermission]
  );

  const locale = language === 'it' ? 'it-IT' : 'en-US';

  const sendTestNotification = useCallback(async () => {
    let currentPerm = getBrowserPermissionState();
    if (currentPerm === 'default') {
      currentPerm = await requestPermission();
    }

    const iss = stations.iss;
    const title =
      language === 'it'
        ? `🛰️ Test Notifica OrbitalTrack — ${iss.shortName}`
        : `🛰️ OrbitalTrack Test Notification — ${iss.shortName}`;

    const body =
      language === 'it'
        ? `Posizione: ${userLocation.label} • Distanza attuale ${iss.shortName}: ${Math.round(
            iss.distanceToUserKm
          ).toLocaleString('it-IT')} km (El ${iss.elevationDeg.toFixed(1)}°, Az ${Math.round(
            iss.azimuthDeg
          )}° ${azimuthToCompass(iss.azimuthDeg, 'it')}).`
        : `Location: ${userLocation.label} • Current distance to ${iss.shortName}: ${Math.round(
            iss.distanceToUserKm
          ).toLocaleString('en-US')} km (El ${iss.elevationDeg.toFixed(1)}°, Az ${Math.round(
            iss.azimuthDeg
          )}° ${azimuthToCompass(iss.azimuthDeg, 'en')}).`;

    const alert: PassAlertNotification = {
      id: `test-${Date.now()}`,
      stationId: 'iss',
      stationName: iss.shortName,
      title,
      body,
      timestamp: Date.now(),
      type: 'test',
    };

    const res = await triggerAlert(alert, preferences.soundEnabled);
    return res.nativeDispatched;
  }, [stations, userLocation.label, preferences.soundEnabled, requestPermission, triggerAlert, language]);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Evaluation loop (throttled to run once every 5 seconds)
  const checkBucket = Math.floor(now.getTime() / 5000);

  useEffect(() => {
    if (!preferences.enabled && scheduledPassIds.length === 0) return;

    const nowMs = Date.now();
    const observerSunEl = getSunElevationAtLocation(
      userLocation.lat,
      userLocation.lon,
      new Date(nowMs)
    );
    const isObserverSkyDark = observerSunEl <= -4;

    // 1. Check real-time proximity / visibility for each station
    if (preferences.enabled && preferences.notifyOnEnterVisibility) {
      (['iss', 'tiangong'] as StationId[]).forEach((stId) => {
        if (!preferences.stations[stId]) return;
        const st = stations[stId];
        if (!st) return;

        // Visible above minimum elevation OR within the user-configured proximity distance (km)
        const isVisibleByElevation =
          st.isAboveHorizon && st.elevationDeg >= preferences.minElevationDeg;
        const isWithinDistance = st.distanceToUserKm <= preferences.maxDistanceKm;

        if (!isVisibleByElevation && !isWithinDistance) return;

        // Check optical visibility requirement if enabled
        const isNakedEyeNow = st.isAboveHorizon && st.isSunlit && isObserverSkyDark;
        if (preferences.onlyVisuallyObservable && !isNakedEyeNow) return;

        // Cooldown of 35 minutes per station proximity event
        const proximityKey = `proximity-${stId}`;
        const lastFired = firedAlertsRef.current[proximityKey] || 0;
        if (nowMs - lastFired < 35 * 60 * 1000) return;

        recordFiredAlert(proximityKey, nowMs);

        const visibilityLabel = isNakedEyeNow
          ? language === 'it'
            ? 'Visibile a occhio nudo ora!'
            : 'Visible to naked eye now!'
          : st.isAboveHorizon
          ? language === 'it'
            ? 'Sopra il tuo orizzonte ora'
            : 'Above your horizon now'
          : language === 'it'
          ? `In avvicinamento (${Math.round(st.distanceToUserKm)} km)`
          : `Approaching (${Math.round(st.distanceToUserKm)} km)`;

        const alertTitle =
          language === 'it'
            ? `🛰️ ${st.shortName} vicina a ${userLocation.label}!`
            : `🛰️ ${st.shortName} near ${userLocation.label}!`;

        const alertBody =
          language === 'it'
            ? `${visibilityLabel} • Elevazione ${st.elevationDeg.toFixed(
                1
              )}° verso ${azimuthToCompass(st.azimuthDeg, 'it')} (Az ${Math.round(
                st.azimuthDeg
              )}°) • Distanza ${Math.round(st.distanceToUserKm).toLocaleString('it-IT')} km.`
            : `${visibilityLabel} • Elevation ${st.elevationDeg.toFixed(
                1
              )}° towards ${azimuthToCompass(st.azimuthDeg, 'en')} (Az ${Math.round(
                st.azimuthDeg
              )}°) • Distance ${Math.round(st.distanceToUserKm).toLocaleString('en-US')} km.`;

        const alert: PassAlertNotification = {
          id: `${proximityKey}-${nowMs}`,
          stationId: stId,
          stationName: st.shortName,
          title: alertTitle,
          body: alertBody,
          timestamp: nowMs,
          type: 'proximity',
        };

        void triggerAlert(alert, preferences.soundEnabled);
      });
    }

    // 2. Check upcoming passes (pre-pass alerts & explicitly scheduled passes)
    upcomingPasses.forEach((pass) => {
      const isExplicitlyScheduled = scheduledPassIds.includes(pass.id);
      const isGeneralEnabled =
        preferences.enabled &&
        preferences.stations[pass.stationId] &&
        pass.maxElevation >= preferences.minElevationDeg &&
        (!preferences.onlyVisuallyObservable || pass.isVisuallyObservable);

      if (!isExplicitlyScheduled && !isGeneralEnabled) return;

      const msUntilAos = pass.aosTime.getTime() - nowMs;
      const leadMinutes =
        preferences.notifyOnPrePassMinutes > 0
          ? preferences.notifyOnPrePassMinutes
          : isExplicitlyScheduled
          ? 5
          : 0;

      // Pre-pass alert (e.g. 10 minutes before AOS)
      if (leadMinutes > 0 && msUntilAos > 30 * 1000 && msUntilAos <= leadMinutes * 60 * 1000) {
        const preKey = `pre-${pass.id}`;
        if (!firedAlertsRef.current[preKey]) {
          recordFiredAlert(preKey, nowMs);
          const minsLeft = Math.max(1, Math.round(msUntilAos / 60000));
          const visTag = pass.isVisuallyObservable
            ? language === 'it'
              ? '✨ Visibile a occhio nudo'
              : '✨ Visible to naked eye'
            : language === 'it'
            ? '📻 Passaggio Radio'
            : '📻 Radio Pass';

          const title =
            language === 'it'
              ? `⏱️ ${pass.stationName} in arrivo tra ${minsLeft} min!`
              : `⏱️ ${pass.stationName} arriving in ${minsLeft} min!`;

          const body =
            language === 'it'
              ? `${visTag} su ${userLocation.label} • Sorge alle ${pass.aosTime.toLocaleTimeString(
                  'it-IT',
                  { hour: '2-digit', minute: '2-digit' }
                )} verso ${azimuthToCompass(pass.aosAzimuth, 'it')} (Culmine ${pass.maxElevation.toFixed(
                  0
                )}°).`
              : `${visTag} over ${userLocation.label} • Rises at ${pass.aosTime.toLocaleTimeString(
                  'en-US',
                  { hour: '2-digit', minute: '2-digit' }
                )} towards ${azimuthToCompass(pass.aosAzimuth, 'en')} (Peak ${pass.maxElevation.toFixed(
                  0
                )}°).`;

          void triggerAlert(
            {
              id: preKey,
              stationId: pass.stationId,
              stationName: pass.stationName,
              title,
              body,
              timestamp: nowMs,
              type: isExplicitlyScheduled ? 'scheduled_pass' : 'pre_pass',
            },
            preferences.soundEnabled
          );
        }
      }

      // AOS start alert for explicitly scheduled passes (when pass begins: -60s to +60s of AOS)
      if (isExplicitlyScheduled && msUntilAos <= 30 * 1000 && msUntilAos >= -90 * 1000) {
        const aosKey = `aos-${pass.id}`;
        if (!firedAlertsRef.current[aosKey]) {
          recordFiredAlert(aosKey, nowMs);

          const title =
            language === 'it'
              ? `🛰️ Passaggio ${pass.stationName} iniziato ora!`
              : `🛰️ ${pass.stationName} pass started now!`;

          const body =
            language === 'it'
              ? `Guarda verso ${azimuthToCompass(pass.aosAzimuth, 'it')} (Az ${Math.round(
                  pass.aosAzimuth
                )}°) • Elevazione massima prevista: ${pass.maxElevation.toFixed(1)}°.`
              : `Look towards ${azimuthToCompass(pass.aosAzimuth, 'en')} (Az ${Math.round(
                  pass.aosAzimuth
                )}°) • Expected maximum elevation: ${pass.maxElevation.toFixed(1)}°.`;

          void triggerAlert(
            {
              id: aosKey,
              stationId: pass.stationId,
              stationName: pass.stationName,
              title,
              body,
              timestamp: nowMs,
              type: 'scheduled_pass',
            },
            preferences.soundEnabled
          );
        }
      }
    });
  }, [
    checkBucket,
    preferences,
    scheduledPassIds,
    stations,
    upcomingPasses,
    userLocation.lat,
    userLocation.lon,
    userLocation.label,
    recordFiredAlert,
    triggerAlert,
    language,
    locale,
  ]);

  return {
    permission,
    preferences,
    scheduledPassIds,
    activeToast,
    recentAlerts,
    lastDispatchDiagnostic,
    requestPermission,
    updatePreferences,
    toggleNotificationsEnabled,
    togglePassReminder,
    sendTestNotification,
    dismissToast,
  };
}
