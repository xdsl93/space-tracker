import { Antenna, Info, Radio, Sparkles, Volume2, Waves } from 'lucide-react';
import React, { useState } from 'react';
import { RADIO_FREQUENCIES } from '../../data/radioFrequencies';
import { useLanguage } from '../../i18n/LanguageContext';
import { calculateDopplerShift } from '../../services/orbitalEngine';
import { StationId, StationTelemetry } from '../../types/station';

interface RadioPanelProps {
  stations: Record<StationId, StationTelemetry>;
  selectedStationId: StationId;
}

export const RadioPanel: React.FC<RadioPanelProps> = ({ stations, selectedStationId }) => {
  const { t, language } = useLanguage();
  const [filterStation, setFilterStation] = useState<'all' | StationId>('all');

  const filteredFreqs = RADIO_FREQUENCIES.filter((f) =>
    filterStation === 'all' ? true : f.stationId === filterStation
  );

  const activeStation = stations[selectedStationId];

  return (
    <div className="rounded-2xl bg-slate-900/75 border border-slate-800 p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30">
            <Radio className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {t.radio.title}
            </h3>
            <p className="text-xs text-slate-400">
              {t.radio.subtitle}
            </p>
          </div>
        </div>

        {/* Station Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterStation('all')}
            className={`px-3 py-1 rounded-lg transition ${
              filterStation === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.radio.allFrequencies} ({RADIO_FREQUENCIES.length})
          </button>
          <button
            onClick={() => setFilterStation('iss')}
            className={`px-3 py-1 rounded-lg transition ${
              filterStation === 'iss'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ISS (ARISS)
          </button>
          <button
            onClick={() => setFilterStation('tiangong')}
            className={`px-3 py-1 rounded-lg transition ${
              filterStation === 'tiangong'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tiangong (CSS)
          </button>
        </div>
      </div>

      {/* Live Doppler Status Banner for Selected Station */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <span className="text-slate-300">
              {t.radio.dopplerBanner}{' '}
            </span>
            <strong className="font-mono text-white">{activeStation.shortName}</strong>
            <span className="text-slate-400 font-mono ml-2">
              ({t.radio.radialVelocity} {activeStation.rangeRateKms > 0 ? '+' : ''}
              {activeStation.rangeRateKms.toFixed(3)} km/s)
            </span>
          </div>
        </div>
        <div className="text-xs font-mono">
          {activeStation.rangeRateKms < 0 ? (
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {t.radio.approachingShift}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {t.radio.recedingShift}
            </span>
          )}
        </div>
      </div>

      {/* Frequency Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFreqs.map((freq) => {
          const st = stations[freq.stationId];
          const downDoppler = freq.downlinkMhz
            ? calculateDopplerShift(freq.downlinkMhz, st.rangeRateKms, 'downlink')
            : null;
          const upDoppler = freq.uplinkMhz
            ? calculateDopplerShift(freq.uplinkMhz, st.rangeRateKms, 'uplink')
            : null;

          const title = language === 'en' && freq.titleEn ? freq.titleEn : freq.title;
          const region = language === 'en' && freq.regionEn ? freq.regionEn : freq.region;
          const status = language === 'en' && freq.statusEn ? freq.statusEn : freq.status;
          const description = language === 'en' && freq.descriptionEn ? freq.descriptionEn : freq.description;
          const listeningTips = language === 'en' && freq.listeningTipsEn ? freq.listeningTipsEn : freq.listeningTips;

          return (
            <div
              key={freq.id}
              className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-4 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                        style={{
                          backgroundColor: `${st.color}20`,
                          color: st.color,
                          border: `1px solid ${st.color}50`,
                        }}
                      >
                        {freq.stationName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{region}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1.5">{title}</h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0 ${
                      freq.status === 'Attivo'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Frequency & Live Doppler Readout Box */}
                <div className="my-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {freq.downlinkMhz && downDoppler && (
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>{t.radio.downlinkRx}</span>
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
                        {downDoppler.shiftedMhz.toFixed(5)} MHz
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-0.5">
                        <span>{t.radio.nominal} {freq.downlinkMhz.toFixed(3)}</span>
                        <span
                          className={
                            downDoppler.shiftHz >= 0 ? 'text-cyan-400' : 'text-rose-400'
                          }
                        >
                          {downDoppler.shiftHz >= 0 ? '+' : ''}
                          {Math.round(downDoppler.shiftHz)} Hz
                        </span>
                      </div>
                    </div>
                  )}

                  {freq.uplinkMhz && upDoppler ? (
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>{t.radio.uplinkTx} {freq.ctcssHz ? `• PL ${freq.ctcssHz}Hz` : ''}</span>
                        <Antenna className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="text-base font-mono font-bold text-amber-300 mt-0.5">
                        {upDoppler.shiftedMhz.toFixed(5)} MHz
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-0.5">
                        <span>{t.radio.nominal} {freq.uplinkMhz.toFixed(3)}</span>
                        <span>
                          {freq.ctcssHz ? `CTCSS ${freq.ctcssHz} Hz` : t.radio.noSubtone}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60 flex flex-col justify-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        {t.radio.modulationMode}
                      </div>
                      <div className="text-xs font-mono font-semibold text-slate-200 mt-1">
                        {freq.mode}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed mb-2">
                  {description}
                </div>
              </div>

              {/* Listening Tip Footer */}
              <div className="mt-2 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-cyan-200/85 bg-cyan-950/20 p-2 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-300">{t.radio.listeningTip} </strong>
                  {listeningTips}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Amateur Radio Practical Guide Box */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>{t.radio.guideTitle}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-400">
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80">
            <strong className="text-slate-200 block mb-1">{t.radio.guideCard1Title}</strong>
            {t.radio.guideCard1Body}
          </div>
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80">
            <strong className="text-slate-200 block mb-1">{t.radio.guideCard2Title}</strong>
            {t.radio.guideCard2Body}
          </div>
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80">
            <strong className="text-slate-200 block mb-1">{t.radio.guideCard3Title}</strong>
            {t.radio.guideCard3Body}
          </div>
        </div>
      </div>
    </div>
  );
};
