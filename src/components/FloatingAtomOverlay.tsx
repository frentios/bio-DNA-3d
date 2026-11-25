import React from 'react';
import {
  HoveredSubunitInfo,
  ActiveGestureType,
  ModelTabId,
  NucleotideCode
} from '../types/molecular';
import { GESTURE_LABELS_VI } from '../services/handGestureEngine';
import { BASE_VISUAL_CONFIG, MODEL_TABS } from '../services/pdbService';
import {
  Crosshair,
  SplitSquareHorizontal,
  Rotate3d,
  FlaskConical,
  Maximize2,
  Minimize2,
  ZoomIn
} from 'lucide-react';

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

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {/* Top-Left Status HUD + Live 3-Axis Palm Orientation + Thumb-Index Zoom */}
      <div className="absolute top-3.5 left-3.5 max-w-md bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-lg px-3.5 py-2.5 space-y-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={gestureInfo.badgeColor}>●</span>
            <span className={`font-semibold ${gestureInfo.badgeColor}`}>{gestureInfo.title}</span>
            {arPassthrough && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-300 font-semibold">AR Thực Tế Tăng Cường</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{gestureInfo.subtitle}</p>
        </div>

        {/* Live 3-Axis Palm Orientation Telemetry (Roll Z, Pitch X, Yaw Y) & Thumb-Index Zoom */}
        <div className="pt-1.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-cyan-300 font-semibold">
            <Rotate3d className="w-3.5 h-3.5" />
            <span>✋ Góc Tay:</span>
          </span>
          <div className="flex items-center gap-2 text-slate-200 tabular-nums">
            <span>
              Yaw(Y): <strong className="text-cyan-300">{wristAnglesDeg.yaw}°</strong>
            </span>
            <span>·</span>
            <span>
              Pitch(X): <strong className="text-emerald-300">{wristAnglesDeg.pitch}°</strong>
            </span>
            <span>·</span>
            <span>
              Roll(Z): <strong className="text-amber-300">{wristAnglesDeg.roll}°</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
              <ZoomIn className="w-3 h-3" />
              <span>{zoomLevelNormalized.toFixed(2)}x</span>
            </span>
          </div>
        </div>

        {/* High-Contrast Color Legend for A, T, G, C, and U */}
        <div className="pt-1.5 border-t border-slate-800/90 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium">
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <strong>A</strong> (C₅H₅N₅)
          </span>
          <span className="text-slate-500">=</span>
          <span className="flex items-center gap-1 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <strong>T</strong> (C₅H₆N₂O₂)
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
            <strong>G</strong> (C₅H₅N₅O)
          </span>
          <span className="text-slate-500">≡</span>
          <span className="flex items-center gap-1 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <strong>C</strong> (C₄H₅N₃O)
          </span>
          {(activeTab === 'DNA_VS_MRNA' || activeTab === 'NUCLEOTIDE_STRUCTURE') && (
            <>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-purple-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                <strong>U - mRNA</strong> (C₄H₄N₂O₂)
              </span>
            </>
          )}
        </div>

        {/* 👍 Thumbs-Up Unzipping / Subunit Separation Progress Bar */}
        {explosionFactor > 0.01 && (
          <div className="pt-1.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono text-orange-300 mb-1">
              <span className="flex items-center gap-1.5">
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                {activeTab === 'NUCLEOTIDE_STRUCTURE'
                  ? '👍 Tách 3 tiểu phần Nucleotide (Photphat · Đường · Bazơ):'
                  : '👍 Tháo xoắn & tách đôi 2 mạch đơn (Unzipping DNA):'}
              </span>
              <span className="tabular-nums font-bold">{Math.round(explosionFactor * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 transition-transform duration-75 origin-left"
                style={{ transform: `scaleX(${explosionFactor})` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Top-Right Fullscreen Button + Active Model Badge */}
      <div className="pointer-events-auto absolute top-3.5 right-3.5 flex flex-col items-end gap-2 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/88 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-right hidden xl:block">
            <div className="text-[10px] font-mono text-slate-400 uppercase">{currentTabMeta.badge}</div>
            <div className="text-xs font-semibold text-cyan-300">{currentTabMeta.shortTitle}</div>
          </div>

          <button
            onClick={onToggleFullScreen}
            title={isFullScreen ? 'Thu nhỏ về khung chuẩn (ESC)' : 'Phóng to tràn màn hình mô hình 3D'}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg border transition-colors cursor-pointer whitespace-nowrap ${
              isFullScreen
                ? 'bg-rose-500 text-white border-rose-400 hover:bg-rose-400'
                : 'bg-cyan-500 text-slate-950 border-cyan-300 hover:bg-cyan-400'
            }`}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Thu Nhỏ Màn Hình (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Phóng To Tràn Màn Hình</span>
              </>
            )}
          </button>
        </div>

        {/* In Fullscreen mode, show floating 4-Tab Switcher so user can switch models seamlessly */}
        {isFullScreen && (
          <div className="flex flex-wrap items-center justify-end gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-1.5">
            {MODEL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.shortTitle}
              </button>
            ))}
          </div>
        )}

        {/* Nucleotide Base Selector Pill Bar when viewing Tab 3: NUCLEOTIDE_STRUCTURE */}
        {activeTab === 'NUCLEOTIDE_STRUCTURE' && (
          <div className="flex items-center gap-1 bg-slate-950/92 backdrop-blur-md border border-cyan-500/40 rounded-lg p-1.5">
            <span className="text-[11px] font-mono text-slate-300 px-1.5">Chọn đơn phân:</span>
            {(['A', 'T', 'G', 'C', 'U'] as NucleotideCode[]).map((base) => {
              const cfg = BASE_VISUAL_CONFIG[base];
              const isSelected = selectedNucleotideBase === base;
              return (
                <button
                  key={base}
                  onClick={() => onSelectNucleotideBase(base)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-transform cursor-pointer ${
                    isSelected
                      ? 'scale-105 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                  style={isSelected ? { backgroundColor: cfg.colorHex } : undefined}
                >
                  {base === 'U' ? 'U (mRNA)' : `d${base}MP (${base})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 👌 Thumb + Index Span Zoom Caliper Indicator on 3D Canvas */}
      {activeGesture === 'PINCH_ZOOM' && pointerScreen && thumbTipScreen && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
          style={{
            left: `${((pointerScreen.x + thumbTipScreen.x) * 0.5) * 100}%`,
            top: `${((pointerScreen.y + thumbTipScreen.y) * 0.5) * 100}%`
          }}
        >
          <div className="px-3 py-1.5 rounded-full bg-amber-500/95 text-slate-950 font-mono text-xs font-bold shadow-lg border border-amber-200 flex items-center gap-1.5 whitespace-nowrap">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>👌 Zoom Cái + Trỏ: {zoomLevelNormalized.toFixed(2)}x</span>
          </div>
        </div>
      )}

      {/* 👉 Point & Inspect Hand Pointer Reticle on 3D Canvas */}
      {pointerScreen && activeGesture === 'POINT_INSPECT' && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${pointerScreen.x * 100}%`,
            top: `${pointerScreen.y * 100}%`
          }}
        >
          <div
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
              hoveredInfo
                ? 'border-emerald-400 bg-emerald-400/20 scale-110'
                : 'border-cyan-400/80 bg-cyan-400/10'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                hoveredInfo ? 'bg-emerald-300' : 'bg-cyan-300'
              }`}
            />
          </div>
        </div>
      )}

      {/* 👉 Floating Molecular Card Right At Pointed Nucleotide / Subunit */}
      {hoveredInfo && (
        <div
          className="absolute z-30 transition-transform duration-75"
          style={{
            left: `clamp(14px, ${hoveredInfo.screenX + 18}px, calc(100% - 345px))`,
            top: `clamp(14px, ${hoveredInfo.screenY - 120}px, calc(100% - 220px))`
          }}
        >
          <div className="w-[330px] bg-slate-950/95 backdrop-blur-md border border-cyan-400/60 rounded-lg p-3.5 shadow-2xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-white">
                  👉 Vị trí #{hoveredInfo.subunit.stepIndex} · {hoveredInfo.subunit.strandLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-emerald-300">
                {hoveredInfo.subunit.titleVi}
              </div>
              <span
                className="px-2.5 py-0.5 rounded text-xs font-mono font-bold text-slate-950 shrink-0"
                style={{
                  backgroundColor:
                    BASE_VISUAL_CONFIG[hoveredInfo.subunit.baseCode]?.colorHex || '#38BDF8'
                }}
              >
                {hoveredInfo.subunit.hydrogenBondCount === 0
                  ? hoveredInfo.subunit.baseCode
                  : `${hoveredInfo.subunit.baseCode} ${
                      hoveredInfo.subunit.hydrogenBondCount === 2 ? '=' : '≡'
                    } ${hoveredInfo.subunit.partnerBaseCode}`}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-200 bg-slate-900/90 p-2.5 rounded border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1 shrink-0">
                  <FlaskConical className="w-3 h-3 text-cyan-400" />
                  Công thức:
                </span>
                <span className="font-mono font-semibold text-cyan-300 text-right">
                  {hoveredInfo.subunit.chemicalFormula}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">Cấu trúc:</span>
                <span className="font-mono text-slate-100 text-right">
                  {hoveredInfo.subunit.chemicalGroupVi}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">Liên kết Hydro:</span>
                <span className="font-mono font-bold text-amber-300 text-right">
                  {hoveredInfo.subunit.hydrogenBondCount === 0
                    ? 'Mạch đơn / Liên kết cộng hóa trị'
                    : `${hoveredInfo.subunit.hydrogenBondCount} liên kết Hydro (${
                        hoveredInfo.subunit.hydrogenBondCount === 2 ? 'A = T' : 'G ≡ C'
                      })`}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-cyan-100/90 leading-snug">
              {hoveredInfo.subunit.ntbsRuleVi}
            </div>
          </div>
        </div>
      )}

      {/* Bottom 6-Gesture Summary Legend Bar */}
      <div className="absolute bottom-3 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 bg-slate-950/88 backdrop-blur-md border border-slate-800/90 rounded-lg px-3.5 py-2 text-[11px] text-slate-300">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <span>
            ✋ <strong className="text-cyan-300">Xòe tay:</strong> Đồng bộ Roll/Pitch/Yaw
          </span>
          <span className="text-slate-600">·</span>
          <span>
            👌 <strong className="text-amber-300">Ngón Cái + Ngón Trỏ:</strong> Mở/Khép để Zoom Vào/Ra
          </span>
          <span className="text-slate-600">·</span>
          <span>
            ✌️ <strong className="text-sky-300">Chữ V:</strong> Nhìn từ đỉnh xuống
          </span>
          <span className="text-slate-600">·</span>
          <span>
            👍 <strong className="text-orange-300">Ngón cái:</strong> Tách mạch / Tách đơn phân
          </span>
          <span className="text-slate-600">·</span>
          <span>
            ✊ <strong className="text-fuchsia-300">Nắm tay:</strong> Kéo xoay quán tính
          </span>
          <span className="text-slate-600">·</span>
          <span>
            👉 <strong className="text-emerald-300">1 Ngón trỏ:</strong> Thẻ công thức A,T,G,C,U
          </span>
        </div>
      </div>
    </div>
  );
};
