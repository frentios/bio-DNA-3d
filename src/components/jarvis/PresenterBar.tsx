import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { LessonStep } from '../../services/lessonPlan';

interface PresenterBarProps {
  steps: LessonStep[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  onExit: () => void;
  showQuestion: boolean;
  onToggleQuestion: () => void;
}

/** Thanh giáo án ở cạnh dưới màn hình khi trình chiếu */
export const PresenterBar: React.FC<PresenterBarProps> = ({
  steps,
  index,
  onPrev,
  onNext,
  onJump,
  onExit,
  showQuestion,
  onToggleQuestion
}) => {
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] h-[var(--presenter-bar-h)] border-t border-[#00e5ff]/30 bg-[#02060d]/95 backdrop-blur-xl">
      <div className="h-full max-w-[1800px] mx-auto px-6 py-4 flex gap-6">
        {/* Nội dung bước */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="eyebrow">
              Bước {index + 1}/{steps.length}
            </span>
            <span className="text-slate-400 text-sm truncate">{step.title}</span>
          </div>
          {/* key theo bước: mỗi lần đổi bước, nội dung mới hiện ngay (không chờ hiệu ứng cũ) */}
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-1.5 space-y-2 overflow-hidden"
            >
              <h2 className="hud-title hud-glow text-2xl xl:text-[32px] leading-tight font-bold text-[#e6fdff]">
                {step.keyPoint}
              </h2>
              <p className="text-base xl:text-lg text-slate-300 leading-relaxed line-clamp-2">{step.body}</p>
              {step.question && showQuestion && (
                <p className="text-base xl:text-lg stark-glow font-semibold">❓ {step.question}</p>
              )}
            </motion.div>

          {/* Chấm tiến trình */}
          <div className="mt-auto flex items-center gap-1.5 pt-2">
            {steps.map((s, i) => (
              <button
                key={s.title}
                onClick={() => onJump(i)}
                title={`${i + 1}. ${s.title}`}
                aria-label={`Đến bước ${i + 1}`}
                className={`h-1.5 cursor-pointer transition-all ${
                  i === index
                    ? 'w-10 bg-[#00e5ff] shadow-[0_0_10px_#00e5ff]'
                    : i < index
                      ? 'w-5 bg-[#00e5ff]/50'
                      : 'w-5 bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Nút điều khiển */}
        <div className="flex flex-col justify-between items-end gap-2 shrink-0">
          <button onClick={onExit} className="btn btn-ghost !py-1.5">
            <X className="w-4 h-4" />
            Thoát <span className="kbd">Esc</span>
          </button>
          {step.question && (
            <button onClick={onToggleQuestion} className="btn btn-ghost !py-1.5 !text-[#ffb000] !border-[#ffb000]/50">
              <HelpCircle className="w-4 h-4" />
              {showQuestion ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'} <span className="kbd">Q</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <button onClick={onPrev} disabled={index === 0} className="btn btn-ghost !px-4 !py-3 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-5 h-5" />
              Trước
            </button>
            <button onClick={isLast ? onExit : onNext} className="btn btn-primary !px-6 !py-3 !text-sm">
              {isLast ? 'Kết thúc' : 'Bước tiếp theo'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="kbd">←</span> <span className="kbd">→</span> / <span className="kbd">Space</span> để chuyển bước
          </div>
        </div>
      </div>
    </div>
  );
};
