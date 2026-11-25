import React from 'react';
import { Hand, Lock, LockOpen, Magnet } from 'lucide-react';
import { ArFollowMode, ArFollowPhase } from '../../services/arFollow';

interface ArFollowPanelProps {
  enabled: boolean;
  onToggle: () => void;
  mode: ArFollowMode;
  onModeChange: (m: ArFollowMode) => void;
  lockUpright: boolean;
  onToggleLock: () => void;
  phase: ArFollowPhase;
  cameraOn: boolean;
}

const PHASE_TEXT: Record<ArFollowPhase, { label: string; color: string }> = {
  REST: { label: 'Chưa cầm', color: 'text-slate-400' },
  HELD: { label: 'Đang cầm', color: 'text-[#00e5ff]' },
  PLACED: { label: 'Đã đặt xuống', color: 'text-[#ffb000]' },
  TWO_HAND: { label: 'Hai tay cầm hai đầu', color: 'text-emerald-300' },
  LOST: { label: 'Mất dấu tay…', color: 'text-rose-300' }
};

/** Bảng điều khiển “Bám theo tay” trong chế độ AR */
export const ArFollowPanel: React.FC<ArFollowPanelProps> = ({
  enabled,
  onToggle,
  mode,
  onModeChange,
  lockUpright,
  onToggleLock,
  phase,
  cameraOn
}) => {
  const hint = !cameraOn
    ? 'Bật camera ở khung “Điều khiển bằng tay” để dùng.'
    : mode === 'FOLLOW'
      ? 'Đưa tay vào khung hình: mô hình lơ lửng trên lòng bàn tay. Hai tay: mô hình nằm giữa hai tay.'
      : '✊ Nắm tay chỗ mô hình để nhấc lên · ✋ Xoè tay để đặt xuống · ✊✊ Nắm hai tay để cầm hai đầu.';

  return (
    <div className="pointer-events-auto absolute left-3 bottom-12 z-30 w-[min(320px,calc(100%-24px))] bg-[#02060d]/85 backdrop-blur-md border border-[#00e5ff]/40 p-3 space-y-2.5 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]">
      <div className="flex items-center justify-between gap-2">
        <span className="hud-title text-xs font-semibold text-[#7df9ff] flex items-center gap-1.5 uppercase tracking-wider">
          <Magnet className="w-3.5 h-3.5" />
          Bám theo tay
        </span>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={`relative w-9 h-5 cursor-pointer transition-colors ${enabled ? 'bg-[#00e5ff]' : 'bg-white/15'}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${enabled ? 'left-[18px]' : 'left-0.5'}`}
          />
        </button>
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                { id: 'FOLLOW', label: 'Luôn bám' },
                { id: 'GRAB', label: 'Cầm – đặt' }
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                className={`chip justify-center ${mode === m.id ? 'chip-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${PHASE_TEXT[phase].color}`}>
              <Hand className="w-3.5 h-3.5" />
              {PHASE_TEXT[phase].label}
            </span>
            <button
              onClick={onToggleLock}
              aria-pressed={lockUpright}
              className={`chip !py-0.5 !text-[11px] ${lockUpright ? 'chip-active' : ''}`}
              title="Khi bật: mô hình luôn đứng thẳng, chỉ di chuyển và to nhỏ theo tay"
            >
              {lockUpright ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
              {lockUpright ? 'Đứng thẳng' : 'Nghiêng theo tay'}
            </button>
          </div>

          <p className="text-[10.5px] text-slate-400 leading-snug">{hint}</p>
        </>
      )}
    </div>
  );
};
