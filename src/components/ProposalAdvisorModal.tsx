import React from 'react';
import { motion } from 'motion/react';
import { HIGH_SCHOOL_GESTURE_IDEAS } from '../services/pdbService';
import { BioInteractionIdea } from '../types/molecular';
import { ArrowUpRight, BookOpen } from 'lucide-react';

interface ProposalAdvisorSectionProps {
  onSelectIdeaDemo: (idea: BioInteractionIdea) => void;
}

const CARD_GLOWS = [
  'from-cyan-400/25',
  'from-amber-400/25',
  'from-orange-400/25',
  'from-sky-400/25',
  'from-fuchsia-400/25',
  'from-emerald-400/25'
];

const FORMULAS = [
  { k: 'Nguyên tắc bổ sung', v: 'A = T · G ≡ C', c: 'text-emerald-300' },
  { k: 'Một chu kỳ xoắn', v: '10 cặp nu = 34 Å', c: 'text-cyan-300' },
  { k: 'Khoảng cách 2 cặp nu', v: '3,4 Å · lệch 36°', c: 'text-amber-300' },
  { k: 'Đường kính chuỗi xoắn', v: '20 Å (2 nm)', c: 'text-sky-300' },
  { k: 'Chiều dài · liên kết hydrogen', v: 'L = N/2 × 3,4 · H = 2A + 3G', c: 'text-fuchsia-300' },
  { k: 'Khối lượng phân tử', v: 'M = N × 300 amu', c: 'text-orange-300' }
];

export const ProposalAdvisorSection: React.FC<ProposalAdvisorSectionProps> = ({
  onSelectIdeaDemo
}) => {
  return (
    <section id="proposals" className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-14 space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl space-y-3"
      >
        <div className="eyebrow">Hướng dẫn sử dụng</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
          6 cử chỉ tự nhiên để <span className="text-gradient">cầm, xoay và khám phá</span> chuỗi DNA
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Mỗi cử chỉ trước camera gắn với một thao tác trên mô hình: xoay 3 trục, nhìn dọc trục xoắn,
          tháo xoắn khi nhân đôi, phóng to liên kết hydrogen hay tra cứu công thức từng nucleotide.
          Bấm “Thử trên mô hình” để xem mô phỏng ngay.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {HIGH_SCHOOL_GESTURE_IDEAS.map((idea, i) => (
          <motion.article
            key={idea.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
            whileHover={{ y: -4 }}
            className="panel group p-5 flex flex-col justify-between overflow-hidden hover:border-white/20 transition-colors"
          >
            <div
              className={`pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${CARD_GLOWS[i % CARD_GLOWS.length]} to-transparent blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`}
            />
            <div className="relative space-y-3">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-2xl group-hover:scale-110 transition-transform">
                  {idea.gestureIcon}
                </span>
                <span className="text-[11px] text-cyan-200/80 leading-snug">{idea.highSchoolTopic}</span>
              </div>
              <h3 className="text-[15px] font-bold text-white leading-snug">
                {idea.title.replace(/^\S+\s\d\.\s/, '')}
              </h3>
              <p className="text-xs text-amber-200/90 font-medium">{idea.subtitle}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{idea.scientificApplication}</p>
            </div>

            <div className="relative mt-5 pt-4 border-t border-white/5 space-y-3">
              <div className="text-[11px] text-slate-500">
                Cách làm: <span className="text-emerald-300">{idea.gestureTrigger}</span>
              </div>
              <button onClick={() => onSelectIdeaDemo(idea)} className="btn btn-ghost w-full group/btn">
                Thử trên mô hình
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      <motion.div
        id="sgk-formulas"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        className="panel panel-accent p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-white/5">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Mô hình Watson – Crick (1953)
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Hằng số cấu trúc và công thức của DNA</h3>
          </div>
          <div className="text-xs font-mono text-emerald-300">
            A = T (2 liên kết hydrogen) · G ≡ C (3 liên kết hydrogen)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-5">
          {FORMULAS.map((f, i) => (
            <div key={f.k} className="panel-inset p-4 flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">
                <span className="font-mono mr-1">0{i + 1}</span>
                {f.k}
              </span>
              <span className={`font-mono font-semibold text-sm ${f.c}`}>{f.v}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
