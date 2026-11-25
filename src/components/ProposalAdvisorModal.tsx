import React from 'react';
import { HIGH_SCHOOL_GESTURE_IDEAS } from '../services/pdbService';
import { BioInteractionIdea } from '../types/molecular';
import { ArrowUpRight, BookOpen } from 'lucide-react';

interface ProposalAdvisorSectionProps {
  onSelectIdeaDemo: (idea: BioInteractionIdea) => void;
}

export const ProposalAdvisorSection: React.FC<ProposalAdvisorSectionProps> = ({
  onSelectIdeaDemo
}) => {
  return (
    <section
      id="proposals"
      className="max-w-[1440px] mx-auto px-6 py-10 border-t border-slate-800/80 space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-mono text-cyan-400">
            BỘ 6 CỬ CHỈ BÀN TAY CẦM MÔ HÌNH DNA WATSON & CRICK (1953)
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            6 Cử Chỉ Tự Nhiên Giúp Bạn Cầm, Xoay & Khám Phá Chuỗi DNA Như Giáo Cụ Thật Trên Tay
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Mỗi cử chỉ tay trước Camera được đồng bộ trực tiếp với hình học không gian của chuỗi xoắn kép: từ nghiêng cổ tay 3 trục (Roll, Pitch, Yaw), nhìn xuyên từ đỉnh trục xoắn, tháo xoắn nhân đôi bằng ngón cái, cho đến rà ngón trỏ tra cứu công thức hóa học của từng nucleotide (A, T, G, C).
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 shrink-0">
          Mô hình DNA xoắn kép đơn giản chuẩn Watson & Crick (1953)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HIGH_SCHOOL_GESTURE_IDEAS.map((idea) => (
          <div
            key={idea.id}
            className="bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between hover:border-cyan-500/50 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <span>{idea.highSchoolTopic}</span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">{idea.title}</h3>
              <p className="text-xs text-amber-300 font-medium">{idea.subtitle}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{idea.scientificApplication}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
              <div className="text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">Cử chỉ kích hoạt:</span>{' '}
                <span className="text-emerald-300">{idea.gestureTrigger}</span>
              </div>

              <button
                onClick={() => onSelectIdeaDemo(idea)}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/40 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Mô Phỏng Cử Chỉ Này Trên Mô Hình 3D</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary of Watson-Crick Constants & Formulas */}
      <div
        id="sgk-formulas"
        className="bg-[#111827] border border-cyan-500/40 rounded-lg p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <BookOpen className="w-3.5 h-3.5" />
              <span>HẰNG SỐ CẤU TRÚC KHÔNG GIAN DNA WATSON & CRICK (1953)</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Bảng Hệ Thống Công Thức & Thông Số Chuỗi Xoắn Kép B-DNA
            </h3>
          </div>
          <div className="text-xs font-mono text-emerald-300">
            A = T (2 liên kết Hydro) · G ≡ C (3 liên kết Hydro)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 text-xs text-slate-200">
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">1. Nguyên tắc bổ sung (NTBS):</span>
            <span className="font-mono font-semibold text-emerald-300">A = T (2 lk H) · G ≡ C (3 lk H)</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">2. Chiều cao 1 chu kỳ xoắn:</span>
            <span className="font-mono font-semibold text-cyan-300">10 cặp base = 20 nu = 34 Å</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">3. Khoảng cách 2 bậc liên tiếp:</span>
            <span className="font-mono font-semibold text-amber-300">3,4 Å (0,34 nm) · Xoay 36°</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">4. Đường kính trụ xoắn kép:</span>
            <span className="font-mono font-semibold text-sky-300">20 Å (2 nm) đối xứng tâm</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">5. Chiều dài & Tổng liên kết Hydro:</span>
            <span className="font-mono font-semibold text-fuchsia-300">L = (N/2)×3,4 Å · H = 2A + 3G</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded p-3 flex items-center justify-between">
            <span className="text-slate-400">6. Khối lượng phân tử DNA:</span>
            <span className="font-mono font-semibold text-orange-300">M = N × 300 đvC</span>
          </div>
        </div>
      </div>
    </section>
  );
};
