import { DEFAULT_TLES, STATION_METADATA } from '../data/defaultTles';
import { StationId, TleData } from '../types/station';

const STORAGE_KEY = 'orbitaltrack_tle_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function loadCachedTles(): Record<StationId, TleData> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<StationId, TleData>;
    if (parsed.iss?.line1 && parsed.tiangong?.line1) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedTles(tles: Record<StationId, TleData>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tles));
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchSingleTleFromCelestrak(stationId: StationId): Promise<TleData | null> {
  const meta = STATION_METADATA[stationId];
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${meta.noradId}&FORMAT=TLE`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length >= 3 && lines[1].startsWith('1 ') && lines[2].startsWith('2 ')) {
      return {
        id: stationId,
        name: lines[0],
        noradId: meta.noradId,
        line1: lines[1],
        line2: lines[2],
        updatedAt: Date.now(),
        source: 'celestrak',
      };
    } else if (lines.length >= 2 && lines[0].startsWith('1 ') && lines[1].startsWith('2 ')) {
      return {
        id: stationId,
        name: meta.shortName,
        noradId: meta.noradId,
        line1: lines[0],
        line2: lines[1],
        updatedAt: Date.now(),
        source: 'celestrak',
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchIssTleFromWhereTheIss(): Promise<TleData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544/tles', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.line1 && data?.line2) {
      return {
        id: 'iss',
        name: data.name || 'ISS (ZARYA)',
        noradId: 25544,
        line1: data.line1,
        line2: data.line2,
        updatedAt: Date.now(),
        source: 'wheretheiss',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSpaceStationTles(forceRefresh = false): Promise<Record<StationId, TleData>> {
  const cached = loadCachedTles();
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.iss.updatedAt < CACHE_TTL_MS) {
    return cached;
  }

  const result: Record<StationId, TleData> = {
    iss: cached?.iss || DEFAULT_TLES.iss,
    tiangong: cached?.tiangong || DEFAULT_TLES.tiangong,
  };

  const [issCelestrak, tiangongCelestrak] = await Promise.all([
    fetchSingleTleFromCelestrak('iss'),
    fetchSingleTleFromCelestrak('tiangong'),
  ]);

  if (issCelestrak) {
    result.iss = issCelestrak;
  } else {
    const issBackup = await fetchIssTleFromWhereTheIss();
    if (issBackup) {
      result.iss = issBackup;
    }
  }

  if (tiangongCelestrak) {
    result.tiangong = tiangongCelestrak;
  }

  saveCachedTles(result);
  return result;
}
