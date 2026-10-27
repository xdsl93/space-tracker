import { ChevronLeft, ChevronRight, Globe2, Map, Sun } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { getSubsolarPoint } from '../services/orbitalEngine';
import { StationId, StationTelemetry, UserLocation } from '../types/station';
import { EarthGlobe3D } from './globe3d/EarthGlobe3D';
import { WorldMap2D } from './map2d/WorldMap2D';

export type ViewMode = '3d' | '2d';

interface ViewportSwitcherProps {
  now: Date;
  stations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
  onSelectStation: (id: StationId) => void;
  userLocation: UserLocation;
}

export const ViewportSwitcher: React.FC<ViewportSwitcherProps> = ({
  now,
  stations,
  selectedStationId,
  onSelectStation,
  userLocation,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const subsolar = useMemo(() => getSubsolarPoint(now), [now]);

  const toggleView = () => {
    setViewMode((prev) => (prev === '3d' ? '2d' : '3d'));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX.current;
    const deltaY = endY - touchStartY.current;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0 && viewMode === '3d') {
        setViewMode('2d');
      } else if (deltaX > 0 && viewMode === '2d') {
        setViewMode('3d');
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <section className="w-full bg-[#03060f] border-b border-slate-800/80 flex flex-col">
      {/* Dedicated Top Bar for 3D <-> 2D Switcher (Zero overlap with the 3D/2D canvas!) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-6 py-2 flex items-center justify-between gap-2"
      >
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
          {/* 3D / 2D Segmented Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.viewport.globe3d}</span>
            </button>

            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5 shrink-0" />
              <span>{t.viewport.map2d}</span>
            </button>
          </div>

          {/* Subsolar & Swipe Hint on Tablet/Desktop */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-amber-300/90 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {t.viewport.sun}: {subsolar.lat.toFixed(1)}°, {subsolar.lon.toFixed(1)}°
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Viewport Container */}
      <div className="relative w-full h-[46vh] sm:h-[56vh] min-h-[320px] max-h-[640px] overflow-hidden">
        {/* Left Edge Slide Button */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-y-14 left-0 w-8 z-20 flex items-center justify-center pointer-events-auto"
        >
          <button
            onClick={toggleView}
            title={viewMode === '3d' ? t.viewport.scrollToMap : t.viewport.returnToGlobe}
            className="p-1.5 sm:p-2 rounded-r-xl bg-slate-950/75 hover:bg-slate-900 border border-l-0 border-slate-700/80 text-cyan-400 shadow-lg backdrop-blur-md transition"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right Edge Slide Button */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-y-14 right-0 w-8 z-20 flex items-center justify-center pointer-events-auto"
        >
          <button
            onClick={toggleView}
            title={viewMode === '3d' ? t.viewport.scrollToMap : t.viewport.returnToGlobe}
            className="p-1.5 sm:p-2 rounded-l-xl bg-slate-950/75 hover:bg-slate-900 border border-r-0 border-slate-700/80 text-cyan-400 shadow-lg backdrop-blur-md transition"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Horizontal Sliding Track (200% width) */}
        <div
          className="w-[200%] h-full flex transition-transform duration-500 ease-out"
          style={{
            transform: viewMode === '3d' ? 'translateX(0%)' : 'translateX(-50%)',
          }}
        >
          {/* Slide 1: 3D Interactive Globe */}
          <div className="w-1/2 h-full relative">
            <EarthGlobe3D
              now={now}
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStation={onSelectStation}
              userLocation={userLocation}
            />
          </div>

          {/* Slide 2: 2D Equirectangular Map */}
          <div
            className="w-1/2 h-full relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <WorldMap2D
              now={now}
              stations={stations}
              selectedStationId={selectedStationId}
              onSelectStation={onSelectStation}
              userLocation={userLocation}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
