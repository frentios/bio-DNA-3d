import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const LINES = [
  'Khởi động J.A.R.V.I.S …',
  'Nạp mô hình phân tử DNA …',
  'Hiệu chuẩn cảm biến cử chỉ …',
  'Hệ thống sẵn sàng.'
];

/** Màn hình khởi động ngắn (~1,6 giây) kiểu JARVIS; bỏ qua nếu người dùng tắt hiệu ứng chuyển động */
export const BootSequence: React.FC = () => {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [visible, setVisible] = useState(!reduce);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const step = window.setInterval(() => setLine((l) => Math.min(LINES.length - 1, l + 1)), 340);
    const done = window.setTimeout(() => setVisible(false), 1600);
    return () => {
      window.clearInterval(step);
      window.clearTimeout(done);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#02060d] cursor-pointer"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45 }}
          onClick={() => setVisible(false)}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-36 h-36">
              <span className="absolute inset-0 rounded-full border-2 border-[#00e5ff]/70 border-t-transparent animate-spin" />
              <span className="absolute inset-3 rounded-full border border-[#ffb000]/60 border-b-transparent animate-spin-rev" />
              <span className="absolute inset-8 rounded-full bg-[#00e5ff]/20 blur-md" />
              <span className="absolute inset-[3.25rem] rounded-full bg-[#7df9ff] shadow-[0_0_40px_10px_rgba(0,229,255,0.7)]" />
            </div>
            <div className="font-[family-name:var(--font-hud)] text-[#7df9ff] tracking-[0.3em] text-lg hud-glow">
              J.A.R.V.I.S
            </div>
            <div className="w-72 space-y-1.5 font-mono text-xs text-[#7df9ff]/80">
              {LINES.slice(0, line + 1).map((l, i) => (
                <div key={l} className={i === LINES.length - 1 ? 'stark-glow' : ''}>
                  › {l}
                </div>
              ))}
              <div className="h-0.5 bg-[#00e5ff]/15 mt-3">
                <div
                  className="h-full bg-[#00e5ff] origin-left shadow-[0_0_8px_#00e5ff]"
                  style={{ animation: 'boot-line 1.5s ease-out forwards' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
