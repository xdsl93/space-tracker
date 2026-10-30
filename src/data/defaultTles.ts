import { StationId, TleData } from '../types/station';

export const STATION_METADATA: Record<
  StationId,
  {
    id: StationId;
    name: string;
    shortName: string;
    noradId: number;
    designator: string;
    agency: string;
    color: string;
    accentColor: string;
    inclinationDeg: number;
    crewInfo: string;
    dimensions: string;
    massKg: string;
    launchYear: number;
  }
> = {
  iss: {
    id: 'iss',
    name: 'International Space Station (ISS - ZARYA)',
    shortName: 'ISS (ZARYA)',
    noradId: 25544,
    designator: '1998-067A',
    agency: 'NASA / Roscosmos / ESA / JAXA / CSA',
    color: '#38bdf8',
    accentColor: '#f59e0b',
    inclinationDeg: 51.64,
    crewInfo: '7 Astronauti (Expedition Permanente)',
    dimensions: '109m × 73m × 20m',
    massKg: '~450.000 kg',
    launchYear: 1998,
  },
  tiangong: {
    id: 'tiangong',
    name: 'Tiangong Space Station (CSS - TIANHE)',
    shortName: 'Tiangong (CSS)',
    noradId: 48274,
    designator: '2021-035A',
    agency: 'CMSA (China Manned Space Agency)',
    color: '#fbbf24',
    accentColor: '#ef4444',
    inclinationDeg: 41.47,
    crewInfo: '3 Taikonauti (Equipaggio Shenzhou)',
    dimensions: '55m × 39m (Configurazione a T)',
    massKg: '~100.000 kg',
    launchYear: 2021,
  },
};

export const DEFAULT_TLES: Record<StationId, TleData> = {
  iss: {
    id: 'iss',
    name: 'ISS (ZARYA)',
    noradId: 25544,
    line1: '1 25544U 98067A   25050.51844213  .00016717  00000-0  30143-3 0  9996',
    line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49815350496852',
    updatedAt: Date.now(),
    source: 'fallback',
  },
  tiangong: {
    id: 'tiangong',
    name: 'CSS (TIANHE)',
    noradId: 48274,
    line1: '1 48274U 21035A   25050.48912037  .00021540  00000-0  25910-3 0  9993',
    line2: '2 48274  41.4735 312.8142 0004812 278.4120  81.6412 15.60124510215648',
    updatedAt: Date.now(),
    source: 'fallback',
  },
};
