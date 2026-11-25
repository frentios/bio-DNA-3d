import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HoveredSubunitInfo,
  ActiveGestureType,
  ModelTabId,
  NucleotideCode
} from '../types/molecular';
import { GESTURE_LABELS_VI } from '../services/handGestureEngine';
import { BASE_VISUAL_CONFIG, MODEL_TABS } from '../services/pdbService';
import { Crosshair, FlaskConical, Maximize2, Minimize2, ZoomIn, Rotate3d } from 'lucide-react';

interface FloatingAtomOverlayProps {
  activeTab: ModelTabId;
  onSelectTab: (tab: ModelTabId) => void;
  selectedNucleotideBase: NucleotideCode;
  onSelectNucleotideBase: (base: NucleotideCode) => void;
  hoveredInfo: HoveredSubunitInfo | null;
  pointerScreen: { x: number; y: number } | null;
  thumbTipScreen: { x: number; y: number } | null;
  zoomLevelNormalized: number;
  activeGesture: ActiveGestureType;
  wristAnglesDeg: { pitch: number; yaw: number; roll: number };
  explosionFactor: number;
  arPassthrough: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

const GESTURE_HINTS: { icon: string; text: string }[] = [
  { icon: '✋', text: 'Xoay 3D' },
  { icon: '👌', text: 'Phóng to' },
  { icon: '✌️', text: 'Nhìn đỉnh' },
  { icon: '👍', text: 'Tách mạch' },
  { icon: '✊', text: 'Quán tính' },
  { icon: '👉', text: 'Tra cứu' }
];

export const FloatingAtomOverlay: React.FC<FloatingAtomOverlayProps> = ({
  activeTab,
  onSelectTab,
  selectedNucleotideBase,
  onSelectNucleotideBase,
  hoveredInfo,
  pointerScreen,
  thumbTipScreen,
  zoomLevelNormalized,
  activeGesture,
  wristAnglesDeg,
  explosionFactor,
  arPassthrough,
  isFullScreen,
  onToggleFullScreen
}) => {
  const gestureInfo = GESTURE_LABELS_VI[activeGesture];
  const currentTabMeta = MODEL_TABS.find((t) => t.id === activeTab) || MODEL_TABS[0];
  const legendBases: NucleotideCode[] =
    activeTab === 'DNA_VS_MRNA' || activeTab === 'NUCLEOTIDE_STRUCTURE'
      ? ['A', 'T', 'G', 'C', 'U']
      : ['A', 'T', 'G', 'C'];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {/* HUD trên-trái: cử chỉ hiện tại + góc + chú giải màu */}
      <div className="absolute top-3 left-3 max-w-[calc(100%-180px)] sm:max-w-sm space-y-2">
        <div className="bg-ink-950/75 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base leading-none">{gestureInfo.icon}</span>
            <span className={`font-semibold truncate ${gestureInfo.badgeColor}`}>
              {activeGesture === 'IDLE' ? 'Kéo chuột để xoay · cuộn để phóng to' : gestureInfo.shortTitle}
            </span>
            {arPassthrough && (
              <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10px] font-bold shrink-0">
                AR
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5 text-[10.5px] font-mono text-slate-400">
            <Rotate3d className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>
              Y <b className="text-cyan-300 font-semibold">{wristAnglesDeg.yaw}°</b>
            </span>
            <span>
              X <b className="text-emerald-300 font-semibold">{wristAnglesDeg.pitch}°</b>
            </span>
            <span>
              Z <b className="text-amber-300 font-semibold">{wristAnglesDeg.roll}°</b>
            </span>
            <span className="flex items-center gap-0.5 text-amber-200">
              <ZoomIn className="w-3 h-3" />
              {zoomLevelNormalized.toFixed(2)}×
            </span>
          </div>
        </div>

        <div className="hidden sm:flex flex-wrap items-center gap-1.5">
          {legendBases.map((b) => {
            const cfg = BASE_VISUAL_CONFIG[b];
            return (
              <span
                key={b}
                className="flex items-center gap-1.5 bg-ink-950/75 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-2.5 py-0.5 text-[10.5px] text-slate-300"
              >
                <span
                  className="grid place-items-center w-4 h-4 rounded-full text-[9px] font-bold font-mono text-ink-950"
                  style={{ backgroundColor: cfg.colorHex }}
                >
                  {b}
                </span>
                {cfg.englishName}
              </span>
            );
          })}
        </div>

        <AnimatePresence>
          {explosionFactor > 0.01 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="bg-ink-950/75 backdrop-blur-md border border-orange-400/30 rounded-xl px-3 py-2"
            >
              <div className="flex items-center justify-between text-[11px] text-orange-200 mb-1.5">
                <span>
                  👍{' '}
                  {activeTab === 'NUCLEOTIDE_STRUCTURE'
                    ? 'Tách phosphate · đường · base'
                    : 'Tháo xoắn, tách 2 mạch đơn'}
                </span>
                <span className="font-mono font-bold">{Math.round(explosionFactor * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 origin-left"
                  style={{ transform: `scaleX(${explosionFactor})` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trên-phải: nút toàn màn hình + bộ chọn */}
      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-2 z-30">
        <div className="flex items-center gap-2">
          <div className="hidden xl:block bg-ink-950/75 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-right">
            <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider">
              {currentTabMeta.badge}
            </div>
            <div className="text-xs font-semibold text-cyan-200">{currentTabMeta.shortTitle}</div>
          </div>
          <button
            onClick={onToggleFullScreen}
            title={isFullScreen ? 'Thu nhỏ (ESC)' : 'Phóng to toàn màn hình'}
            aria-label={isFullScreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            className={`grid place-items-center w-9 h-9 rounded-xl border backdrop-blur-md cursor-pointer transition-colors ${
              isFullScreen
                ? 'bg-rose-500/80 border-rose-300/50 text-white hover:bg-rose-500'
                : 'bg-ink-950/75 border-white/15 text-cyan-200 hover:border-cyan-300/60'
            }`}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {isFullScreen && (
          <div className="flex flex-wrap items-center justify-end gap-1 bg-ink-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1">
            {MODEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-300 to-emerald-300 text-ink-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.navLabel}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'NUCLEOTIDE_STRUCTURE' && (
          <div className="flex items-center gap-1 bg-ink-950/80 backdrop-blur-md border border-white/10 rounded-xl p-1">
            {(['A', 'T', 'G', 'C', 'U'] as NucleotideCode[]).map((base) => {
              const cfg = BASE_VISUAL_CONFIG[base];
              const isSelected = selectedNucleotideBase === base;
              return (
                <button
                  key={base}
                  onClick={() => onSelectNucleotideBase(base)}
                  title={base === 'U' ? 'UMP (RNA)' : `d${base}MP (DNA)`}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                    isSelected ? 'text-ink-950 scale-105' : 'text-slate-300 hover:bg-white/5'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: cfg.colorHex, boxShadow: `0 0 14px ${cfg.colorHex}88` }
                      : { color: cfg.colorHex }
                  }
                >
                  {base}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 👌 Chỉ báo zoom giữa ngón cái và ngón trỏ */}
      {activeGesture === 'PINCH_ZOOM' && pointerScreen && thumbTipScreen && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
          style={{
            left: `${(pointerScreen.x + thumbTipScreen.x) * 50}%`,
            top: `${(pointerScreen.y + thumbTipScreen.y) * 50}%`
          }}
        >
          <div className="px-3 py-1.5 rounded-full bg-amber-400 text-ink-950 font-mono text-xs font-bold shadow-lg shadow-amber-500/40 flex items-center gap-1.5 whitespace-nowrap">
            <ZoomIn className="w-3.5 h-3.5" />
            {zoomLevelNormalized.toFixed(2)}×
          </div>
        </div>
      )}

      {/* 👉 Tâm ngắm của ngón trỏ */}
      {pointerScreen && activeGesture === 'POINT_INSPECT' && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pointerScreen.x * 100}%`, top: `${pointerScreen.y * 100}%` }}
        >
          <div
            className={`w-11 h-11 rounded-full border-2 grid place-items-center transition-all ${
              hoveredInfo
                ? 'border-emerald-400 bg-emerald-400/20 scale-110'
                : 'border-cyan-300/80 bg-cyan-400/10 animate-pulse'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${hoveredInfo ? 'bg-emerald-300' : 'bg-cyan-200'}`} />
          </div>
        </div>
      )}

      {/* Thẻ thông tin bay cạnh chi tiết đang trỏ */}
      <AnimatePresence>
        {hoveredInfo && (
          <motion.div
            key={hoveredInfo.subunit.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30"
            style={{
              left: `clamp(12px, ${hoveredInfo.screenX + 18}px, calc(100% - 312px))`,
              top: `clamp(12px, ${hoveredInfo.screenY - 110}px, calc(100% - 230px))`
            }}
          >
            <div className="w-[300px] bg-ink-950/90 backdrop-blur-xl border border-cyan-300/30 rounded-2xl p-3.5 shadow-2xl shadow-black/60 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-400">
                <Crosshair className="w-3 h-3 text-emerald-400 shrink-0" />
                #{hoveredInfo.subunit.stepIndex} · {hoveredInfo.subunit.strandLabel}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold text-white leading-snug">{hoveredInfo.subunit.titleVi}</div>
                <span
                  className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-ink-950 shrink-0"
                  style={{
                    backgroundColor: BASE_VISUAL_CONFIG[hoveredInfo.subunit.baseCode]?.colorHex || '#38BDF8'
                  }}
                >
                  {hoveredInfo.subunit.hydrogenBondCount === 0
                    ? hoveredInfo.subunit.baseCode
                    : `${hoveredInfo.subunit.baseCode} ${
                        hoveredInfo.subunit.hydrogenBondCount === 2 ? '=' : '≡'
                      } ${hoveredInfo.subunit.partnerBaseCode}`}
                </span>
              </div>

              <dl className="space-y-1.5 text-[11.5px] bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 flex items-center gap-1 shrink-0">
                    <FlaskConical className="w-3 h-3 text-cyan-400" />
                    Công thức
                  </dt>
                  <dd className="font-mono text-cyan-200 text-right">{hoveredInfo.subunit.chemicalFormula}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Cấu trúc</dt>
                  <dd className="text-slate-100 text-right">{hoveredInfo.subunit.chemicalGroupVi}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400 shrink-0">Liên kết hydrogen</dt>
                  <dd className="font-mono text-amber-300 text-right">
                    {hoveredInfo.subunit.hydrogenBondCount === 0
                      ? 'Không (mạch đơn / cộng hoá trị)'
                      : `${hoveredInfo.subunit.hydrogenBondCount} liên kết`}
                  </dd>
                </div>
              </dl>

              <p className="text-[11px] text-slate-300 leading-snug">{hoveredInfo.subunit.ntbsRuleVi}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chú giải cử chỉ phía dưới */}
      <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 items-center gap-1 bg-ink-950/70 backdrop-blur-md border border-white/10 rounded-full px-2 py-1">
        {GESTURE_HINTS.map((h) => (
          <span
            key={h.text}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] text-slate-300 whitespace-nowrap"
          >
            <span>{h.icon}</span>
            {h.text}
          </span>
        ))}
      </div>
    </div>
  );
};
