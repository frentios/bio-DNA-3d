import React, { useEffect, useState } from 'react';
import { ActiveGestureType } from '../../types/molecular';

interface JarvisHudProps {
  activeGesture: ActiveGestureType;
  handsDetected: number;
  zoom: number;
  explosion: number;
  modelLabel: string;
  /** Phóng to chữ khi trình chiếu */
  large?: boolean;
}

/** Lớp HUD kiểu JARVIS phủ lên khung 3D — chỉ để trang trí, không bắt sự kiện chuột */
export const JarvisHud: React.FC<JarvisHudProps> = ({
  activeGesture,
  handsDetected,
  zoom,
  explosion,
  modelLabel,
  large = false
}) => {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = clock.toLocaleTimeString('vi-VN', { hour12: false });
  const tracking = handsDetected > 0;
  const textSize = large ? 'text-[13px]' : 'text-[10px]';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      <div className="hud-scanline" />

      {/* Vòng arc reactor quanh mô hình */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92%,640px)] aspect-square opacity-70"
        viewBox="0 0 400 400"
      >
        <defs>
          <radialGradient id="arcGlow">
            <stop offset="0" stopColor="#00e5ff" stopOpacity="0.10" />
            <stop offset="0.7" stopColor="#00e5ff" stopOpacity="0.02" />
            <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#arcGlow)" />
        <g className="origin-center animate-spin-slow" style={{ transformBox: 'fill-box' }}>
          <circle cx="200" cy="200" r="190" fill="none" stroke="#00e5ff" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" />
          <path d="M200 10 A190 190 0 0 1 390 200" fill="none" stroke="#00e5ff" strokeOpacity="0.8" strokeWidth="2" />
          <path d="M200 390 A190 190 0 0 1 10 200" fill="none" stroke="#00e5ff" strokeOpacity="0.8" strokeWidth="2" />
        </g>
        <g className="origin-center animate-spin-rev" style={{ transformBox: 'fill-box' }}>
          <circle cx="200" cy="200" r="172" fill="none" stroke="#ffb000" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="40 14 4 14" />
        </g>
        <g stroke="#00e5ff" strokeOpacity="0.5">
          {Array.from({ length: 72 }).map((_, i) => {
            const a = (i * Math.PI * 2) / 72;
            const r1 = i % 6 === 0 ? 150 : 156;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * r1}
                y1={200 + Math.sin(a) * r1}
                x2={200 + Math.cos(a) * 160}
                y2={200 + Math.sin(a) * 160}
                strokeWidth={i % 6 === 0 ? 1.5 : 0.75}
              />
            );
          })}
        </g>
      </svg>

      {/* Dấu ngoặc 4 góc */}
      {[
        'top-2 left-2 border-t-2 border-l-2',
        'top-2 right-2 border-t-2 border-r-2',
        'bottom-2 left-2 border-b-2 border-l-2',
        'bottom-2 right-2 border-b-2 border-r-2'
      ].map((c) => (
        <span
          key={c}
          className={`absolute w-8 h-8 border-[#00e5ff] ${c}`}
          style={{ filter: 'drop-shadow(0 0 4px #00e5ff)' }}
        />
      ))}

      {/* Thước vạch hai bên */}
      {(['left-3', 'right-3'] as const).map((side) => (
        <div key={side} className={`absolute ${side} top-1/2 -translate-y-1/2 flex flex-col gap-[7px] opacity-60`}>
          {Array.from({ length: 15 }).map((_, i) => (
            <span
              key={i}
              className={`block h-px bg-[#00e5ff] ${side === 'right-3' ? 'ml-auto' : ''}`}
              style={{ width: i % 5 === 0 ? 14 : 7 }}
            />
          ))}
        </div>
      ))}

      {/* Dòng trạng thái dưới */}
      <div
        className={`absolute bottom-3 left-12 right-12 hidden sm:flex items-center justify-between font-[family-name:var(--font-hud)] uppercase tracking-[0.18em] text-[#7df9ff]/80 ${textSize}`}
      >
        <span className="animate-flicker">J.A.R.V.I.S · {modelLabel}</span>
        <span className="flex items-center gap-4">
          <span className={tracking ? 'text-[#ffb000]' : ''}>
            {tracking ? `◉ Bám ${handsDetected} tay` : '○ Chờ tay'}
          </span>
          <span>Zoom {zoom.toFixed(2)}×</span>
          <span>Tách {Math.round(explosion * 100)}%</span>
          <span>{activeGesture === 'IDLE' ? 'Sẵn sàng' : 'Đang điều khiển'}</span>
          <span className="tabular-nums">{time}</span>
        </span>
      </div>
    </div>
  );
};
