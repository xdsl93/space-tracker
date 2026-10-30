import { Moon, Sun } from 'lucide-react';
import React, { useMemo } from 'react';
import { WORLD_LAND_POLYGONS } from '../../data/worldLandPolygons';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSubsolarPoint } from '../../services/orbitalEngine';
import { GeoPoint, StationId, StationTelemetry, UserLocation } from '../../types/station';

interface WorldMap2DProps {
  now: Date;
  stations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
  onSelectStation: (id: StationId) => void;
  userLocation: UserLocation;
}

const MAP_WIDTH = 1440;
const MAP_HEIGHT = 720;

function lonToX(lon: number): number {
  return ((lon + 180) / 360) * MAP_WIDTH;
}

function latToY(lat: number): number {
  return ((90 - lat) / 180) * MAP_HEIGHT;
}

function splitTrackAtAntimeridian(track: GeoPoint[]): string[] {
  if (track.length < 2) return [];
  const segments: Array<Array<[number, number]>> = [[]];

  for (let i = 0; i < track.length; i++) {
    const pt = track[i];
    const x = lonToX(pt.lon);
    const y = latToY(pt.lat);

    if (i > 0) {
      const prevLon = track[i - 1].lon;
      if (Math.abs(pt.lon - prevLon) > 170) {
        segments.push([]);
      }
    }
    segments[segments.length - 1].push([x, y]);
  }

  return segments
    .filter((seg) => seg.length >= 2)
    .map((seg) =>
      seg
        .map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
        .join(' ')
    );
}

function computeNightShadowPath(now: Date): {
  nightPath: string;
  terminatorLine: string;
  subsolar: { lat: number; lon: number };
} {
  const subsolar = getSubsolarPoint(now);
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const decDeg = Math.abs(subsolar.lat) < 0.05 ? 0.05 : subsolar.lat;
  const tanDec = Math.tan(decDeg * rad);

  const curvePoints: Array<[number, number]> = [];

  for (let lon = -180; lon <= 180; lon += 2) {
    const deltaLon = (lon - subsolar.lon) * rad;
    const terminatorLat = Math.atan(-Math.cos(deltaLon) / tanDec) * deg;
    curvePoints.push([lonToX(lon), latToY(terminatorLat)]);
  }

  const terminatorLine = curvePoints
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');

  const darkPoleY = decDeg > 0 ? MAP_HEIGHT : 0;
  const nightPath = `${terminatorLine} L${MAP_WIDTH},${darkPoleY} L0,${darkPoleY} Z`;

  return { nightPath, terminatorLine, subsolar };
}

function computeFootprintPaths(lat: number, lon: number, radiusKm: number): string[] {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const angularRadius = radiusKm / 6371.0;

  const latR = lat * rad;
  const lonR = lon * rad;

  const pts: GeoPoint[] = [];
  for (let brng = 0; brng <= 360; brng += 6) {
    const bR = brng * rad;
    const sinLat =
      Math.sin(latR) * Math.cos(angularRadius) +
      Math.cos(latR) * Math.sin(angularRadius) * Math.cos(bR);
    const pLat = Math.asin(Math.max(-1, Math.min(1, sinLat)));

    const y = Math.sin(bR) * Math.sin(angularRadius) * Math.cos(latR);
    const x = Math.cos(angularRadius) - Math.sin(latR) * Math.sin(pLat);
    let pLon = (lonR + Math.atan2(y, x)) * deg;
    pLon = ((((pLon + 180) % 360) + 360) % 360) - 180;

    pts.push({
      lat: pLat * deg,
      lon: pLon,
      altKm: 0,
      timestamp: 0,
    });
  }

  return splitTrackAtAntimeridian(pts);
}

export const WorldMap2D: React.FC<WorldMap2DProps> = ({
  now,
  stations,
  selectedStationId,
  onSelectStation,
  userLocation,
}) => {
  const { t } = useLanguage();
  const { nightPath, terminatorLine, subsolar } = useMemo(
    () => computeNightShadowPath(now),
    [now]
  );

  const continentPaths = useMemo(() => {
    return WORLD_LAND_POLYGONS.map((poly) =>
      poly
        .map(([lon, lat], idx) => `${idx === 0 ? 'M' : 'L'}${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`)
        .join(' ') + ' Z'
    );
  }, []);

  const stationEntries = [stations.iss, stations.tiangong];

  const userX = lonToX(userLocation.lon);
  const userY = latToY(userLocation.lat);
  const sunX = lonToX(subsolar.lon);
  const sunY = latToY(subsolar.lat);

  return (
    <div className="relative w-full h-full bg-[#040917] flex items-center justify-center overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-full object-contain"
      >
        <defs>
          <linearGradient id="oceanDayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#091d38" />
            <stop offset="50%" stopColor="#0c2d57" />
            <stop offset="100%" stopColor="#091d38" />
          </linearGradient>

          <radialGradient id="sunGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#oceanDayGrad)" />

        <image
          href="https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg"
          x={0}
          y={0}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          preserveAspectRatio="none"
          opacity={0.78}
        />

        <g>
          {continentPaths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="rgba(30, 82, 69, 0.35)"
              stroke="rgba(56, 189, 248, 0.42)"
              strokeWidth={1.3}
            />
          ))}
        </g>

        <g stroke="rgba(148, 163, 184, 0.16)" strokeWidth={1} strokeDasharray="4 4">
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
            <g key={`lon-${lon}`}>
              <line x1={lonToX(lon)} y1={0} x2={lonToX(lon)} y2={MAP_HEIGHT} />
              <text
                x={lonToX(lon) + 4}
                y={MAP_HEIGHT - 8}
                fill="rgba(148, 163, 184, 0.55)"
                fontSize={12}
                fontFamily="monospace"
              >
                {lon > 0 ? `${lon}°E` : lon < 0 ? `${Math.abs(lon)}°W` : '0°'}
              </text>
            </g>
          ))}
          {[-60, -30, 0, 30, 60].map((lat) => (
            <g key={`lat-${lat}`}>
              <line
                x1={0}
                y1={latToY(lat)}
                x2={MAP_WIDTH}
                y2={latToY(lat)}
                stroke={lat === 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(148, 163, 184, 0.16)'}
                strokeDasharray={lat === 0 ? undefined : '4 4'}
              />
              <text
                x={8}
                y={latToY(lat) - 5}
                fill="rgba(148, 163, 184, 0.55)"
                fontSize={12}
                fontFamily="monospace"
              >
                {lat > 0 ? `${lat}°N` : lat < 0 ? `${Math.abs(lat)}°S` : 'EQ 0°'}
              </text>
            </g>
          ))}
        </g>

        <path d={nightPath} fill="rgba(2, 6, 20, 0.66)" />
        <path
          d={terminatorLine}
          fill="none"
          stroke="rgba(251, 191, 36, 0.65)"
          strokeWidth={2.2}
          strokeDasharray="6 4"
        />

        <g transform={`translate(${sunX}, ${sunY})`}>
          <circle r={26} fill="url(#sunGlowGrad)" />
          <circle r={6} fill="#fde047" stroke="#f59e0b" strokeWidth={2} />
        </g>

        {stationEntries.map((st) => {
          const isSelected = st.id === selectedStationId;
          const pastSegments = splitTrackAtAntimeridian(st.pastTrack);
          const futureSegments = splitTrackAtAntimeridian(st.futureTrack);
          const footprintSegments = computeFootprintPaths(
            st.lat,
            st.lon,
            st.visibilityFootprintRadiusKm
          );

          return (
            <g key={`tracks-${st.id}`} opacity={isSelected ? 1 : 0.55}>
              {footprintSegments.map((fp, i) => (
                <path
                  key={`fp-${i}`}
                  d={fp}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={isSelected ? 1.8 : 1.1}
                  strokeDasharray="3 3"
                  opacity={0.65}
                />
              ))}

              {pastSegments.map((seg, i) => (
                <path
                  key={`past-${i}`}
                  d={seg}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={isSelected ? 2.2 : 1.4}
                  strokeDasharray="7 6"
                  opacity={0.6}
                />
              ))}

              {futureSegments.map((seg, i) => (
                <path
                  key={`fut-${i}`}
                  d={seg}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={isSelected ? 3.4 : 2.0}
                  filter={isSelected ? 'url(#neonGlow)' : undefined}
                />
              ))}

              {[30, 60, 90].map((minIdx) => {
                const pt = st.futureTrack[minIdx];
                if (!pt || !isSelected) return null;
                const tx = lonToX(pt.lon);
                const ty = latToY(pt.lat);
                return (
                  <g key={`tick-${minIdx}`} transform={`translate(${tx}, ${ty})`}>
                    <circle r={4} fill="#0f172a" stroke={st.color} strokeWidth={2} />
                    <text
                      x={7}
                      y={4}
                      fill={st.color}
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      +{minIdx}m
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        <g transform={`translate(${userX}, ${userY})`}>
          <circle
            r={18}
            fill="rgba(16, 185, 129, 0.18)"
            stroke="#10b981"
            strokeWidth={1.5}
            className="animate-ping"
          />
          <circle r={11} fill="rgba(16, 185, 129, 0.28)" stroke="#10b981" strokeWidth={1.5} />
          <circle r={5.5} fill="#10b981" stroke="#ecfdf5" strokeWidth={2} />
          <g transform="translate(0, -16)">
            <rect
              x={-54}
              y={-18}
              width={108}
              height={20}
              rx={5}
              fill="rgba(6, 78, 59, 0.92)"
              stroke="#10b981"
              strokeWidth={1.2}
            />
            <text
              x={0}
              y={-4}
              textAnchor="middle"
              fill="#a7f3d0"
              fontSize={11}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {t.common.you} ({userLocation.lat.toFixed(1)}°, {userLocation.lon.toFixed(1)}°)
            </text>
          </g>
        </g>

        {stationEntries.map((st) => {
          const sx = lonToX(st.lon);
          const sy = latToY(st.lat);
          const isSelected = st.id === selectedStationId;

          return (
            <g
              key={`marker-${st.id}`}
              transform={`translate(${sx}, ${sy})`}
              onClick={() => onSelectStation(st.id)}
              className="cursor-pointer"
            >
              <circle
                r={isSelected ? 24 : 16}
                fill={`${st.color}22`}
                stroke={st.color}
                strokeWidth={isSelected ? 2 : 1.2}
              />

              <g transform={`rotate(${st.headingDeg})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={-34}
                  stroke={st.color}
                  strokeWidth={2.5}
                />
                <polygon points="0,-40 -5,-30 5,-30" fill={st.color} />
              </g>

              {st.id === 'iss' ? (
                <g transform="scale(1.15)">
                  <rect x={-16} y={-2} width={32} height={4} fill="#e2e8f0" rx={1} />
                  <rect x={-3} y={-10} width={6} height={20} fill="#f8fafc" rx={1.5} />
                  <rect x={-15} y={-12} width={5} height={24} fill="#f59e0b" stroke="#fef3c7" strokeWidth={0.8} />
                  <rect x={-8} y={-12} width={5} height={24} fill="#f59e0b" stroke="#fef3c7" strokeWidth={0.8} />
                  <rect x={3} y={-12} width={5} height={24} fill="#f59e0b" stroke="#fef3c7" strokeWidth={0.8} />
                  <rect x={10} y={-12} width={5} height={24} fill="#f59e0b" stroke="#fef3c7" strokeWidth={0.8} />
                </g>
              ) : (
                <g transform="scale(1.15)">
                  <rect x={-11} y={-3} width={22} height={5} fill="#fef3c7" rx={1.5} />
                  <rect x={-3} y={-9} width={6} height={18} fill="#fbbf24" rx={1.5} />
                  <rect x={-15} y={-11} width={5} height={22} fill="#eab308" stroke="#fef08a" strokeWidth={0.8} />
                  <rect x={10} y={-11} width={5} height={22} fill="#eab308" stroke="#fef08a" strokeWidth={0.8} />
                </g>
              )}

              <g transform="translate(0, 28)">
                <rect
                  x={-68}
                  y={-10}
                  width={136}
                  height={22}
                  rx={6}
                  fill="rgba(5, 10, 25, 0.92)"
                  stroke={st.color}
                  strokeWidth={isSelected ? 1.8 : 1}
                />
                <text
                  x={0}
                  y={5}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={11.5}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {st.shortName} • {st.lat.toFixed(1)}°,{st.lon.toFixed(1)}°
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Compact Centered Bottom Legend */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md text-[10px] sm:text-[11px] font-mono text-slate-300 pointer-events-auto shadow-xl">
          <button
            onClick={() => onSelectStation('iss')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              selectedStationId === 'iss' ? 'bg-sky-500/20 text-sky-300 font-bold' : ''
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            <span>ISS</span>
          </button>

          <button
            onClick={() => onSelectStation('tiangong')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              selectedStationId === 'tiangong' ? 'bg-amber-500/20 text-amber-300 font-bold' : ''
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Tiangong</span>
          </button>

          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{t.common.user}</span>
          </span>

          <span className="hidden xs:flex items-center gap-1 text-amber-300/90">
            <Sun className="w-3 h-3 text-amber-400" />
            <span>/</span>
            <Moon className="w-3 h-3 text-indigo-400" />
          </span>
        </div>
      </div>
    </div>
  );
};
