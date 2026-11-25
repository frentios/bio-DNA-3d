import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MolecularLayerVisibility,
  HandCameraOrientation,
  HoveredSubunitInfo,
  InspectableSubunit,
  HandTelemetryState,
  BioInteractionIdea,
  NucleotideCode,
  ModelTabId
} from './types/molecular';
import {
  HIGH_SCHOOL_PRESETS,
  buildHighSchoolDNAModel,
  BASE_VISUAL_CONFIG,
  MODEL_TABS,
  DNA_VS_MRNA_COMPARISON_ROWS
} from './services/pdbService';
import { HandGestureComputeOutput } from './services/handGestureEngine';
import { MolecularViewport3D } from './components/MolecularViewport3D';
import { FloatingAtomOverlay } from './components/FloatingAtomOverlay';
import { HandTrackerOverlay, SimulatedGestureAction } from './components/HandTrackerOverlay';
import { ProposalAdvisorSection } from './components/ProposalAdvisorModal';
import {
  Dna,
  RotateCcw,
  ScanLine,
  ZoomIn,
  Sparkles,
  SplitSquareHorizontal,
  Compass,
  BookOpen,
  Calculator,
  Layers,
  Wand2,
  FlaskConical,
  Maximize2,
  Atom,
  GitCompare,
  Hexagon
} from 'lucide-react';

export function App() {
  // 1. Active 3D Model Tab (4 Tabs: Watson-Crick DNA, Molecular DNA, Nucleotide Structure, DNA vs mRNA)
  const [activeTab, setActiveTab] = useState<ModelTabId>('WATSON_CRICK_DNA');
  const [selectedNucleotideBase, setSelectedNucleotideBase] = useState<NucleotideCode>('A');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // 2. Sequence & Preset State
  const [activePresetId, setActivePresetId] = useState<string>('WC_1_TURN');
  const [sequenceStrand1, setSequenceStrand1] = useState<string>('ATGCATGCAT');
  const [mutatedStepIndex, setMutatedStepIndex] = useState<number | null>(null);

  // 3. Layer Visibility & 3D Camera State
  const [layerVisibility, setLayerVisibility] = useState<MolecularLayerVisibility>({
    backbone: true,
    nucleobase: true,
    hydrogenBonds: true,
    baseLabels3D: true,
    sgkRuler3D: true
  });
  const [cameraOrientation, setCameraOrientation] = useState<HandCameraOrientation>('FREE_3D');
  const [explosionFactor, setExplosionFactor] = useState<number>(0);
  const [arPassthrough, setArPassthrough] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // 4. ✋ 1:1 Palm 3D Orientation State (Roll Z, Pitch X, Yaw Y)
  const [cameraWristEuler, setCameraWristEuler] = useState<{ x: number; y: number; z: number } | null>(
    null
  );
  const [virtualWristDeg, setVirtualWristDeg] = useState<{ pitch: number; yaw: number; roll: number }>({
    pitch: 12,
    yaw: -25,
    roll: 0
  });
  const [useVirtualWrist, setUseVirtualWrist] = useState<boolean>(true);

  // 5. ✊ Fist Inertia, 👌 Thumb-Index Span Zoom, and 👉 Point & Inspect State
  const [hoveredInfo, setHoveredInfo] = useState<HoveredSubunitInfo | null>(null);
  const [selectedSubunit, setSelectedSubunit] = useState<InspectableSubunit | null>(null);
  const [focusedStepIndex, setFocusedStepIndex] = useState<number | null>(null);
  const [inertiaImpulse, setInertiaImpulse] = useState<{ x: number; y: number } | null>(null);
  const [handZoomFactor, setHandZoomFactor] = useState<number | null>(null);

  const [telemetry, setTelemetry] = useState<HandTelemetryState>({
    handsDetected: 0,
    primaryGesture: 'IDLE',
    gestureConfidence: 0,
    indexTipScreen: null,
    thumbTipScreen: null,
    pinchDistance: 0,
    zoomLevelNormalized: 1.0,
    handRollDeg: 0,
    handPitchDeg: 12,
    handYawDeg: -25,
    inertiaSpeed: 0
  });

  // Listen for Escape key to exit Full-Screen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const { steps, stats } = useMemo(
    () => buildHighSchoolDNAModel(sequenceStrand1, mutatedStepIndex),
    [sequenceStrand1, mutatedStepIndex]
  );

  const activeTargetWristEuler = useMemo(() => {
    if (cameraWristEuler !== null) {
      return cameraWristEuler;
    }
    if (useVirtualWrist && !autoRotate) {
      return {
        x: (virtualWristDeg.pitch * Math.PI) / 180,
        y: (virtualWristDeg.yaw * Math.PI) / 180,
        z: (virtualWristDeg.roll * Math.PI) / 180
      };
    }
    return null;
  }, [cameraWristEuler, useVirtualWrist, autoRotate, virtualWristDeg]);

  const displayedWristAnglesDeg = useMemo(() => {
    if (telemetry.handsDetected > 0) {
      return {
        pitch: telemetry.handPitchDeg,
        yaw: telemetry.handYawDeg,
        roll: telemetry.handRollDeg
      };
    }
    return virtualWristDeg;
  }, [telemetry, virtualWristDeg]);

  const handleSelectPreset = (presetId: string) => {
    const preset = HIGH_SCHOOL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setSequenceStrand1(preset.sequenceStrand1);
    setMutatedStepIndex(preset.id === 'WC_POINT_MUTATION' ? 5 : null);
    setFocusedStepIndex(null);
  };

  const handleCycleBaseAtStep = (zeroBasedIndex: number) => {
    const order: NucleotideCode[] = ['A', 'G', 'T', 'C'];
    const chars = stats.sequenceStrand1.split('') as NucleotideCode[];
    if (zeroBasedIndex < 0 || zeroBasedIndex >= chars.length) return;
    const current = chars[zeroBasedIndex];
    const next = order[(order.indexOf(current) + 1) % order.length];
    chars[zeroBasedIndex] = next;
    setSequenceStrand1(chars.join(''));
    setMutatedStepIndex(zeroBasedIndex + 1);
    setActivePresetId('CUSTOM');
  };

  const handleGestureFrame = useCallback((output: HandGestureComputeOutput) => {
    setTelemetry(output.telemetry);
    // Giữ nguyên góc xoay cuối cùng khi chuyển sang cử chỉ khác (chỉ ✋ và ✌️ mới đặt góc mới)
    if (output.targetWristEuler !== null) {
      setCameraWristEuler(output.targetWristEuler);
      setUseVirtualWrist(false);
    } else if (output.telemetry.primaryGesture === 'FIST_INERTIA_GRAB') {
      // ✊ Nắm tay: thả cho mô hình quay tự do theo quán tính, không kéo về góc cũ
      setCameraWristEuler(null);
      setUseVirtualWrist(false);
    }
    setInertiaImpulse(output.inertiaImpulse);
    if (output.targetZoomFactor !== null) {
      setHandZoomFactor(output.targetZoomFactor);
    }

    if (output.targetUnzipFactor !== null) {
      setExplosionFactor((prev) => prev + (output.targetUnzipFactor! - prev) * 0.16);
    }

    if (output.detectedCameraPreset === 'TOP_AXIS') {
      setCameraOrientation('TOP_AXIS');
    }
  }, []);

  const handleSimulateGesture = (type: SimulatedGestureAction) => {
    if (type === 'PALM_3D') {
      setExplosionFactor(0);
      setFocusedStepIndex(null);
      setHandZoomFactor(1.0);
      setUseVirtualWrist(true);
      setCameraWristEuler(null);
      setAutoRotate(false);
      setVirtualWristDeg({ pitch: 24, yaw: 45, roll: -18 });
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'PALM_3D_ORIENTATION',
        handPitchDeg: 24,
        handYawDeg: 45,
        handRollDeg: -18
      }));
    } else if (type === 'PEACE_TOP') {
      setExplosionFactor(0);
      setFocusedStepIndex(null);
      setUseVirtualWrist(true);
      setCameraWristEuler(null);
      setAutoRotate(false);
      setVirtualWristDeg({ pitch: 90, yaw: 0, roll: 0 });
      setCameraOrientation('TOP_AXIS');
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'PEACE_TOP_VIEW',
        handPitchDeg: 90,
        handYawDeg: 0,
        handRollDeg: 0
      }));
    } else if (type === 'THUMBS_UP_UNZIP') {
      setExplosionFactor((prev) => (prev > 0.35 ? 0 : 0.9));
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'THUMBS_UP_UNZIP'
      }));
    } else if (type === 'PINCH_ZOOM') {
      setExplosionFactor(0);
      setFocusedStepIndex(null);
      const nextZoom = handZoomFactor && handZoomFactor > 1.5 ? 0.85 : 2.15;
      setHandZoomFactor(nextZoom);
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'PINCH_ZOOM',
        zoomLevelNormalized: nextZoom,
        indexTipScreen: { x: 0.54, y: 0.44 },
        thumbTipScreen: { x: 0.44, y: 0.52 }
      }));
    } else if (type === 'FIST_INERTIA') {
      setUseVirtualWrist(false);
      setCameraWristEuler(null);
      setInertiaImpulse({ x: 0.04, y: 0.32 });
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'FIST_INERTIA_GRAB',
        inertiaSpeed: 88
      }));
    } else if (type === 'POINT_INSPECT') {
      const targetStep = steps[4] || steps[0];
      const baseForInspect =
        activeTab === 'NUCLEOTIDE_STRUCTURE'
          ? selectedNucleotideBase
          : activeTab === 'DNA_VS_MRNA'
          ? 'U'
          : targetStep.strand1Base;
      const cfg = BASE_VISUAL_CONFIG[baseForInspect];
      const inspected: InspectableSubunit = {
        id: `sim-point-${targetStep.stepIndex}`,
        stepIndex: targetStep.stepIndex,
        partType: 'BASE_STRAND_1',
        baseCode: baseForInspect,
        partnerBaseCode: cfg.partnerCode,
        strandLabel:
          activeTab === 'DNA_VS_MRNA'
            ? "Mạch đơn mRNA (5' → 3')"
            : activeTab === 'NUCLEOTIDE_STRUCTURE'
            ? 'Cấu tạo đơn phân Nucleotide'
            : "Mạch 1 (5' → 3')",
        titleVi: `Nucleotide ${cfg.vietnameseName}`,
        chemicalFormula: cfg.chemicalFormula,
        chemicalGroupVi: cfg.groupType,
        ntbsRuleVi: cfg.ntbsSummary,
        hydrogenBondCount: cfg.hBonds,
        cycleNumber: targetStep.cycleNumber,
        heightAngstrom: targetStep.yAngstrom
      };
      setSelectedSubunit(inspected);
      setHoveredInfo({
        subunit: inspected,
        screenX: 260,
        screenY: 220
      });
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'POINT_INSPECT',
        indexTipScreen: { x: 0.5, y: 0.45 },
        thumbTipScreen: null
      }));
    } else if (type === 'RESET') {
      setExplosionFactor(0);
      setHandZoomFactor(1.0);
      setCameraOrientation('FRONT_HELIX');
      setUseVirtualWrist(true);
      setCameraWristEuler(null);
      setVirtualWristDeg({ pitch: 0, yaw: 0, roll: 0 });
      setFocusedStepIndex(null);
      setHoveredInfo(null);
      setLayerVisibility({
        backbone: true,
        nucleobase: true,
        hydrogenBonds: true,
        baseLabels3D: true,
        sgkRuler3D: true
      });
      setTelemetry((prev) => ({
        ...prev,
        primaryGesture: 'IDLE',
        zoomLevelNormalized: 1.0,
        indexTipScreen: null,
        thumbTipScreen: null
      }));
    }
  };

  const handleSelectIdeaDemo = (idea: BioInteractionIdea) => {
    handleSelectPreset(idea.presetId);
    if (idea.targetTab) {
      setActiveTab(idea.targetTab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (idea.demoAction === 'PALM_ORIENTATION') {
      handleSimulateGesture('PALM_3D');
    } else if (idea.demoAction === 'PEACE_TOP_DOWN') {
      handleSimulateGesture('PEACE_TOP');
    } else if (idea.demoAction === 'THUMBS_UP_UNZIP') {
      setExplosionFactor(0.9);
      setTelemetry((prev) => ({ ...prev, primaryGesture: 'THUMBS_UP_UNZIP' }));
    } else if (idea.demoAction === 'PINCH_ZOOM_HBONDS') {
      handleSimulateGesture('PINCH_ZOOM');
    } else if (idea.demoAction === 'FIST_INERTIA') {
      handleSimulateGesture('FIST_INERTIA');
    } else if (idea.demoAction === 'POINT_INSPECT_DEMO') {
      handleSimulateGesture('POINT_INSPECT');
    }
  };

  const activePreset =
    HIGH_SCHOOL_PRESETS.find((p) => p.id === activePresetId) || HIGH_SCHOOL_PRESETS[0];

  const activeInspect: InspectableSubunit = useMemo(() => {
    if (hoveredInfo?.subunit) return hoveredInfo.subunit;
    if (selectedSubunit) return selectedSubunit;

    if (activeTab === 'NUCLEOTIDE_STRUCTURE') {
      const cfg = BASE_VISUAL_CONFIG[selectedNucleotideBase];
      return {
        id: `default-nuc-${selectedNucleotideBase}`,
        stepIndex: 1,
        partType: 'BASE_STRAND_1',
        baseCode: selectedNucleotideBase,
        partnerBaseCode: cfg.partnerCode,
        strandLabel: 'Cấu tạo đơn phân Nucleotide',
        titleVi: `Đơn phân Nucleotide ${cfg.vietnameseName}`,
        chemicalFormula: cfg.chemicalFormula,
        chemicalGroupVi: cfg.groupType,
        ntbsRuleVi: cfg.ntbsSummary,
        hydrogenBondCount: cfg.hBonds,
        cycleNumber: 1,
        heightAngstrom: 0
      };
    }

    const step = steps[Math.min(4, steps.length - 1)] || steps[0];
    const cfg = BASE_VISUAL_CONFIG[step.strand1Base];
    return {
      id: `default-${step.stepIndex}`,
      stepIndex: step.stepIndex,
      partType: 'BASE_STRAND_1',
      baseCode: step.strand1Base,
      partnerBaseCode: step.strand2Base,
      strandLabel: "Mạch 1 (5' → 3')",
      titleVi: `Nucleotide ${cfg.vietnameseName} (Bậc #${step.stepIndex})`,
      chemicalFormula: cfg.chemicalFormula,
      chemicalGroupVi: cfg.groupType,
      ntbsRuleVi: cfg.ntbsSummary,
      hydrogenBondCount: step.hydrogenBonds,
      cycleNumber: step.cycleNumber,
      heightAngstrom: step.yAngstrom
    };
  }, [hoveredInfo, selectedSubunit, activeTab, selectedNucleotideBase, steps]);

  const getTabIcon = (tabId: ModelTabId) => {
    switch (tabId) {
      case 'WATSON_CRICK_DNA':
        return <Dna className="w-4 h-4" />;
      case 'MOLECULAR_DNA':
        return <Atom className="w-4 h-4" />;
      case 'NUCLEOTIDE_STRUCTURE':
        return <Hexagon className="w-4 h-4" />;
      case 'DNA_VS_MRNA':
        return <GitCompare className="w-4 h-4" />;
    }
  };

  const rangeStyle = (value: number, min: number, max: number, color: string) =>
    ({
      '--range-fill': `${((value - min) / (max - min)) * 100}%`,
      '--range-color': color
    }) as React.CSSProperties;

  const layerItems = [
    {
      key: 'sgkRuler3D' as const,
      label: 'Trục tâm & thước đo 34 Å',
      sub: 'Trục giữa và nhãn định danh mô hình',
      dot: '#22d3ee'
    },
    {
      key: 'baseLabels3D' as const,
      label: 'Nhãn A, T, G, C, U & nguyên tử',
      sub: "Nhận biết nhanh từng nucleotide và vị trí C1'→C5'",
      dot: '#34d399'
    },
    {
      key: 'backbone' as const,
      label: 'Khung đường pentose – phosphate',
      sub: "Dải xoắn 5'→3' hoặc cụm nguyên tử P – O – đường 5C",
      dot: '#38bdf8'
    },
    {
      key: 'hydrogenBonds' as const,
      label: 'Liên kết hydrogen & glycosidic',
      sub: '👌 để phóng to, 👍 để tháo xoắn',
      dot: '#fbbf24'
    }
  ];

  const quickViews = [
    { id: 'FRONT_HELIX', label: 'Chính diện', icon: '✋', wrist: { pitch: 0, yaw: 0, roll: 0 } },
    { id: 'TOP_AXIS', label: 'Nhìn từ đỉnh', icon: '✌️', wrist: { pitch: 90, yaw: 0, roll: 0 } },
    { id: 'SINGLE_TURN_34A', label: 'Nghiêng 3 trục', icon: '✋', wrist: { pitch: 20, yaw: 35, roll: -14 } },
    { id: 'BASE_PAIR_ZOOM', label: 'Sát liên kết', icon: '👌', wrist: { pitch: 12, yaw: 18, roll: 0 } }
  ];

  const statCards = [
    {
      label: 'Tổng số nucleotide',
      formula: 'N = 2A + 2G',
      value: stats.totalNucleotides,
      unit: `nu · ${stats.totalPairs} cặp`,
      color: 'text-white',
      glow: 'from-slate-400/20'
    },
    {
      label: 'Chiều dài',
      formula: 'L = N/2 × 3,4',
      value: stats.lengthAngstrom,
      unit: 'Å',
      color: 'text-cyan-300',
      glow: 'from-cyan-400/25'
    },
    {
      label: 'Liên kết hydrogen',
      formula: 'H = 2A + 3G',
      value: stats.hydrogenBondsTotal,
      unit: 'liên kết',
      color: 'text-amber-300',
      glow: 'from-amber-400/25'
    },
    {
      label: 'Số chu kỳ xoắn',
      formula: 'C = N/20',
      value: stats.helicalTurns,
      unit: 'vòng',
      color: 'text-emerald-300',
      glow: 'from-emerald-400/25'
    }
  ];

  return (
    <div className="min-h-screen text-slate-100 flex flex-col">
      <div className="app-backdrop" aria-hidden>
        <div className="orb w-[420px] h-[420px] bg-cyan-500 -top-32 -left-24" />
        <div
          className="orb w-[380px] h-[380px] bg-violet-600 top-40 -right-32"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="orb w-[360px] h-[360px] bg-emerald-500 bottom-[-120px] left-1/3"
          style={{ animationDelay: '-11s' }}
        />
      </div>

      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 py-3">
          <a href="#workbench" className="flex items-center gap-3 shrink-0 group">
            <span className="relative grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-emerald-400 shadow-lg shadow-cyan-500/30">
              <Dna className="w-5 h-5 text-white transition-transform duration-700 group-hover:rotate-180" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-white">
                BioMotion <span className="text-gradient">3D</span>
              </span>
              <span className="block text-[11px] text-slate-400">Sinh học 10 · Kết nối tri thức</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10">
            {MODEL_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setExplosionFactor(0);
                    setFocusedStepIndex(null);
                  }}
                  className={`relative px-4 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                    isActive ? 'text-ink-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {getTabIcon(tab.id)}
                    {tab.navLabel}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleFullScreen} className="btn btn-ghost hidden sm:inline-flex">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Toàn màn hình</span>
            </button>
            <button
              onClick={() => setArPassthrough((prev) => !prev)}
              className={`btn ${arPassthrough ? 'btn-warm' : 'btn-primary'}`}
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>{arPassthrough ? 'Thoát AR' : 'Đặt lên bàn (AR)'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================== HERO ============================== */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-8 pb-5">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-3xl space-y-3"
          >
            <div className="eyebrow flex items-center gap-2">
              <span className="live-dot" />
              Bài 5 · Các phân tử sinh học · Nucleic acid
            </div>
            <h1 className="text-3xl sm:text-4xl xl:text-[44px] font-extrabold tracking-tight leading-[1.1] text-white text-balance">
              Cầm phân tử <span className="text-gradient">DNA</span> trên tay — xoay, tách mạch
              và khám phá bằng cử chỉ
            </h1>
            <p className="text-sm sm:text-[15px] text-slate-300/90 leading-relaxed max-w-2xl">
              Bốn mô hình 3D bám sát sách giáo khoa: chuỗi xoắn kép Watson – Crick, cấu trúc nguyên
              tử, đơn phân nucleotide và so sánh DNA với mRNA. Bật camera để điều khiển bằng bàn tay,
              hoặc dùng chuột và thanh trượt.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0"
          >
            {[
              { v: '20 Å', l: 'Đường kính' },
              { v: '34 Å', l: '1 chu kỳ xoắn' },
              { v: '10', l: 'cặp nu / chu kỳ' },
              { v: '3,4 Å', l: 'giữa 2 cặp nu' }
            ].map((s) => (
              <div key={s.l} className="panel px-4 py-3 min-w-[110px]">
                <div className="text-xl font-bold font-mono text-white">{s.v}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================== MODEL TABS ============================== */}
      <div id="workbench" className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 space-y-3 scroll-mt-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {MODEL_TABS.map((tab, i) => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.15 }}
                whileHover={{ y: -2 }}
                onClick={() => {
                  setActiveTab(tab.id);
                  setExplosionFactor(0);
                  setFocusedStepIndex(null);
                }}
                className={`panel text-left p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  isActive ? 'panel-accent' : 'hover:border-white/20'
                }`}
              >
                <span
                  className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 transition-colors ${
                    isActive
                      ? 'bg-gradient-to-br from-cyan-300 to-emerald-300 text-ink-950'
                      : 'bg-white/5 text-cyan-300'
                  }`}
                >
                  {getTabIcon(tab.id)}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">0{i + 1}</span>
                    <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {tab.shortTitle}
                    </span>
                  </span>
                  <span className="hidden sm:block text-[11.5px] text-slate-400 mt-1 leading-snug line-clamp-2">
                    {tab.summary}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        {activeTab !== 'NUCLEOTIDE_STRUCTURE' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow flex items-center gap-1.5 mr-1">
              <BookOpen className="w-3.5 h-3.5" />
              Đoạn gen mẫu
            </span>
            {HIGH_SCHOOL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`chip ${activePresetId === preset.id ? 'chip-active' : ''}`}
              >
                {preset.badge}
              </button>
            ))}
            {activePresetId === 'CUSTOM' && <span className="chip chip-active">Tự nhập</span>}
          </div>
        )}
      </div>

      {/* ============================== WORKSPACE ============================== */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:px-6">
        {/* ---------- LEFT: camera + điều khiển ---------- */}
        <aside className="lg:col-span-3 space-y-4 flex flex-col order-2 lg:order-1">
          <HandTrackerOverlay
            onGestureFrame={handleGestureFrame}
            onVideoStreamChange={setVideoStream}
            onSimulateGesture={handleSimulateGesture}
            virtualWristDeg={virtualWristDeg}
            onVirtualWristChange={(deg) => {
              setUseVirtualWrist(true);
      setCameraWristEuler(null);
              setAutoRotate(false);
              setVirtualWristDeg(deg);
            }}
            telemetry={telemetry}
          />

          <div className="panel p-4 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-100 font-semibold flex items-center gap-2">
                  <SplitSquareHorizontal className="w-4 h-4 text-orange-400" />
                  {activeTab === 'NUCLEOTIDE_STRUCTURE'
                    ? 'Tách 3 thành phần nucleotide'
                    : 'Tháo xoắn · tách 2 mạch đơn'}
                </span>
                <span className="font-mono text-orange-300 font-bold">
                  {Math.round(explosionFactor * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explosionFactor}
                onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
                className="range"
                style={rangeStyle(explosionFactor, 0, 1, '#fb923c')}
                aria-label="Mức tách mạch"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Nguyên vẹn</span>
                <span>Bắt đầu tách</span>
                <span>Tách rời</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-100 font-semibold flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-amber-400" />
                  Độ phóng đại
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {(handZoomFactor || 1.0).toFixed(2)}×
                </span>
              </div>
              <input
                type="range"
                min={0.55}
                max={2.45}
                step={0.05}
                value={handZoomFactor || 1.0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setHandZoomFactor(val);
                  setTelemetry((prev) => ({ ...prev, zoomLevelNormalized: val }));
                }}
                className="range"
                style={rangeStyle(handZoomFactor || 1.0, 0.55, 2.45, '#fbbf24')}
                aria-label="Độ phóng đại"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0,55× chụm</span>
                <span>1× chuẩn</span>
                <span>2,45× mở</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Góc nhìn nhanh
                </span>
                <button
                  onClick={() => setAutoRotate((prev) => !prev)}
                  className={`chip !py-0.5 !text-[11px] ${autoRotate ? 'chip-active' : ''}`}
                >
                  {autoRotate ? '⟳ Tự xoay' : 'Đồng bộ tay'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickViews.map((view) => {
                  const active = cameraOrientation === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => {
                        setAutoRotate(false);
                        setUseVirtualWrist(true);
      setCameraWristEuler(null);
                        setVirtualWristDeg(view.wrist);
                        setCameraOrientation(view.id as HandCameraOrientation);
                      }}
                      className={`rounded-xl px-3 py-2 text-left text-xs font-medium cursor-pointer transition-all border ${
                        active
                          ? 'bg-cyan-400/15 border-cyan-400/60 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <span className="mr-1.5">{view.icon}</span>
                      {view.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- CENTER: viewport 3D ---------- */}
        <section className="lg:col-span-6 flex flex-col gap-4 order-1 lg:order-2">
          <div
            className={
              isFullScreen
                ? 'fixed inset-0 z-50 w-screen h-screen bg-ink-950'
                : 'relative flex-1 min-h-[460px] sm:min-h-[540px] lg:min-h-[600px] rounded-2xl overflow-hidden p-px bg-gradient-to-br from-cyan-400/50 via-violet-500/30 to-emerald-400/40 shadow-2xl shadow-cyan-950/50'
            }
          >
            <div
              className={
                isFullScreen
                  ? 'relative w-full h-full'
                  : 'relative w-full h-full rounded-[15px] overflow-hidden bg-[radial-gradient(ellipse_at_center,#0f1a33_0%,#05070f_75%)]'
              }
            >
              <MolecularViewport3D
                activeTab={activeTab}
                selectedNucleotideBase={selectedNucleotideBase}
                steps={steps}
                layerVisibility={layerVisibility}
                explosionFactor={explosionFactor}
                cameraOrientation={cameraOrientation}
                arPassthrough={arPassthrough}
                videoStream={videoStream}
                targetWristEuler={activeTargetWristEuler}
                inertiaImpulse={inertiaImpulse}
                handZoomFactor={handZoomFactor}
                pointerScreenCoords={telemetry.indexTipScreen}
                focusedStepIndex={focusedStepIndex}
                autoRotate={autoRotate}
                onSubunitHover={setHoveredInfo}
                onSubunitSelect={(sub) => {
                  setSelectedSubunit(sub);
                  setFocusedStepIndex((prev) => (prev === sub.stepIndex ? null : sub.stepIndex));
                }}
                onManualRotationChange={(deg) => {
                  setUseVirtualWrist(false);
                  setCameraWristEuler(null);
                  setVirtualWristDeg(deg);
                }}
              />

              <FloatingAtomOverlay
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                selectedNucleotideBase={selectedNucleotideBase}
                onSelectNucleotideBase={setSelectedNucleotideBase}
                hoveredInfo={hoveredInfo}
                pointerScreen={telemetry.indexTipScreen}
                thumbTipScreen={telemetry.thumbTipScreen}
                zoomLevelNormalized={telemetry.zoomLevelNormalized}
                activeGesture={telemetry.primaryGesture}
                wristAnglesDeg={displayedWristAnglesDeg}
                explosionFactor={explosionFactor}
                arPassthrough={arPassthrough}
                isFullScreen={isFullScreen}
                onToggleFullScreen={toggleFullScreen}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'NUCLEOTIDE_STRUCTURE' ? (
              <motion.div
                key="nuc-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="panel p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Đơn phân của nucleic acid</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      Cấu tạo 1 nucleotide — chọn loại base nitrogen
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['A', 'T', 'G', 'C', 'U'] as NucleotideCode[]).map((base) => {
                      const cfg = BASE_VISUAL_CONFIG[base];
                      const active = selectedNucleotideBase === base;
                      return (
                        <button
                          key={base}
                          onClick={() => setSelectedNucleotideBase(base)}
                          className={`chip font-mono ${active ? '!text-ink-950 font-bold' : ''}`}
                          style={
                            active
                              ? { backgroundColor: cfg.colorHex, borderColor: 'transparent' }
                              : { borderColor: `${cfg.colorHex}55` }
                          }
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: active ? '#05070f' : cfg.colorHex }}
                          />
                          {base} · {cfg.englishName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    {
                      n: '①',
                      title: 'Nhóm phosphate',
                      color: 'text-orange-300',
                      border: 'border-orange-400/30',
                      body: (
                        <>
                          Gắn vào carbon <strong>C5&apos;</strong> của đường; nối với C3&apos;-OH của
                          nucleotide kế tiếp bằng liên kết phosphodiester, tạo khung mạch.
                        </>
                      )
                    },
                    {
                      n: '②',
                      title: 'Đường pentose (5C)',
                      color: 'text-cyan-300',
                      border: 'border-cyan-400/30',
                      body:
                        selectedNucleotideBase === 'U'
                          ? "Ribose (C₅H₁₀O₅): có nhóm -OH ở C2' — đặc trưng của RNA."
                          : "Deoxyribose (C₅H₁₀O₄): chỉ có -H ở C2' (thiếu 1 oxygen) — đặc trưng của DNA."
                    },
                    {
                      n: '③',
                      title: `Base nitrogen ${selectedNucleotideBase}`,
                      color: 'text-emerald-300',
                      border: 'border-emerald-400/30',
                      body: (
                        <>
                          {BASE_VISUAL_CONFIG[selectedNucleotideBase].groupType} ·{' '}
                          <span className="font-mono">
                            {BASE_VISUAL_CONFIG[selectedNucleotideBase].nucleotideFormula}
                          </span>
                          . Gắn với đường tại carbon <strong>C1&apos;</strong>.
                        </>
                      )
                    }
                  ].map((card) => (
                    <div key={card.n} className={`panel-inset p-3 space-y-1.5 border ${card.border}`}>
                      <div className={`font-bold ${card.color}`}>
                        <span className="font-mono mr-1">{card.n}</span>
                        {card.title}
                      </div>
                      <p className="text-[11.5px] text-slate-300 leading-relaxed">{card.body}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="seq-panel"
                id="sequence-builder"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="panel p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">
                      {activeTab === 'DNA_VS_MRNA' ? 'Phiên mã' : 'Nguyên tắc bổ sung'}
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {activeTab === 'DNA_VS_MRNA'
                        ? 'Hai mạch DNA và mạch mRNA được phiên mã (T → U)'
                        : 'Các cặp nucleotide — bấm vào một cột để đổi cặp'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sequenceStrand1}
                      onChange={(e) => {
                        setSequenceStrand1(
                          e.target.value.toUpperCase().replace(/X/g, 'C').replace(/[^ATGC]/g, '')
                        );
                        setActivePresetId('CUSTOM');
                      }}
                      placeholder="Nhập mạch 1 (A, T, G, C)…"
                      maxLength={24}
                      aria-label="Trình tự mạch 1"
                      className="w-48 bg-ink-950/80 border border-white/10 focus:border-cyan-400/70 rounded-lg px-3 py-1.5 text-xs font-mono tracking-[0.15em] text-white uppercase focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => handleCycleBaseAtStep(4)}
                      className="btn btn-ghost !py-1.5 !text-amber-200 !border-amber-400/40"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Đột biến cặp #5
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-1 -mx-1 px-1">
                  <div className="inline-flex items-stretch gap-1.5 min-w-full">
                    <div className="flex flex-col justify-around text-[10.5px] font-mono pr-2 shrink-0 py-1.5">
                      <span className="text-sky-300 font-semibold h-7 flex items-center">
                        Mạch 1 (5&apos;→3&apos;)
                      </span>
                      <span className="text-slate-500 h-4 flex items-center">lk hydrogen</span>
                      <span className="text-violet-300 font-semibold h-7 flex items-center">
                        Mạch 2 (3&apos;→5&apos;)
                      </span>
                      {activeTab === 'DNA_VS_MRNA' && (
                        <span className="text-fuchsia-300 font-semibold h-7 flex items-center mt-1">
                          mRNA (5&apos;→3&apos;)
                        </span>
                      )}
                    </div>

                    {steps.map((step, idx) => {
                      const cfg1 = BASE_VISUAL_CONFIG[step.strand1Base];
                      const cfg2 = BASE_VISUAL_CONFIG[step.strand2Base];
                      const cfgMrna = BASE_VISUAL_CONFIG[step.mrnaBase];
                      const isHighlighted =
                        hoveredInfo?.subunit.stepIndex === step.stepIndex ||
                        mutatedStepIndex === step.stepIndex;

                      return (
                        <motion.button
                          layout
                          key={step.stepIndex}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => handleCycleBaseAtStep(idx)}
                          title={`Cặp ${step.stepIndex}: bấm để đổi ${step.strand1Base}-${step.strand2Base}`}
                          className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-xl border cursor-pointer shrink-0 transition-colors ${
                            isHighlighted
                              ? 'bg-amber-400/10 border-amber-400/70'
                              : 'bg-white/[0.03] border-white/10 hover:border-white/25'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-slate-500">#{step.stepIndex}</span>
                          <span
                            className="w-7 h-7 rounded-lg grid place-items-center text-xs font-mono font-bold text-ink-950 shadow-sm"
                            style={{ backgroundColor: cfg1.colorHex, boxShadow: `0 0 12px ${cfg1.colorHex}55` }}
                          >
                            {step.strand1Base}
                          </span>
                          <span className="h-4 flex items-center gap-[2px]">
                            {Array.from({ length: step.hydrogenBonds }).map((_, k) => (
                              <span key={k} className="w-[2px] h-3 rounded bg-amber-300/80" />
                            ))}
                          </span>
                          <span
                            className="w-7 h-7 rounded-lg grid place-items-center text-xs font-mono font-bold text-ink-950 shadow-sm"
                            style={{ backgroundColor: cfg2.colorHex, boxShadow: `0 0 12px ${cfg2.colorHex}55` }}
                          >
                            {step.strand2Base}
                          </span>
                          {activeTab === 'DNA_VS_MRNA' && (
                            <span
                              className="w-7 h-7 mt-1 rounded-lg grid place-items-center text-xs font-mono font-bold text-white ring-1 ring-white/30"
                              style={{ backgroundColor: cfgMrna.colorHex }}
                            >
                              {step.mrnaBase}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ---------- RIGHT: thông số + lớp + thẻ tra cứu ---------- */}
        <aside className="lg:col-span-3 space-y-4 flex flex-col order-3">
          <AnimatePresence mode="wait">
            {activeTab === 'DNA_VS_MRNA' ? (
              <motion.div
                key="compare"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="panel panel-accent p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <GitCompare className="w-4 h-4 text-violet-300" />
                    So sánh DNA và mRNA
                  </div>
                  <span className="chip !cursor-default font-mono !text-violet-200 !border-violet-400/40">
                    U = {stats.countMrnaU}
                  </span>
                </div>
                <div className="space-y-2">
                  {DNA_VS_MRNA_COMPARISON_ROWS.map((row) => (
                    <div key={row.criterion} className="panel-inset p-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-200">{row.criterion}</div>
                      <div className="grid grid-cols-[42px_1fr] gap-x-2 gap-y-1 text-[11.5px] leading-snug">
                        <span className="font-mono font-bold text-sky-300">DNA</span>
                        <span className="text-slate-300">{row.dnaValue}</span>
                        <span className="font-mono font-bold text-violet-300">mRNA</span>
                        <span className="text-slate-300">{row.mrnaValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="panel p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Calculator className="w-4 h-4 text-cyan-300" />
                    Thông số đoạn DNA
                  </div>
                  <span className="chip !cursor-default !text-emerald-200 !border-emerald-400/40">
                    {activePresetId === 'CUSTOM' ? 'Tự nhập' : activePreset.badge}
                  </span>
                </div>
                {activePresetId !== 'CUSTOM' && (
                  <p className="text-xs text-slate-400 leading-relaxed">{activePreset.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {statCards.map((c) => (
                    <div
                      key={c.label}
                      className={`panel-inset p-3 relative overflow-hidden bg-gradient-to-br ${c.glow} to-transparent`}
                    >
                      <div className="text-[10.5px] text-slate-400">{c.label}</div>
                      <motion.div
                        key={String(c.value)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-2xl font-mono font-bold mt-0.5 ${c.color}`}
                      >
                        {c.value}
                      </motion.div>
                      <div className="text-[10px] text-slate-500 flex justify-between gap-1">
                        <span>{c.unit}</span>
                        <span className="font-mono">{c.formula}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="panel-inset p-3 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-emerald-300 font-medium">A = T (2 lk hydrogen)</span>
                      <span className="font-mono text-white">
                        {stats.countA} cặp · {stats.percentAT}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
                        animate={{ width: `${stats.percentAT * 2}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-cyan-300 font-medium">G ≡ C (3 lk hydrogen)</span>
                      <span className="font-mono text-white">
                        {stats.countG} cặp · {stats.percentGC}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 to-rose-400"
                        animate={{ width: `${stats.percentGC * 2}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 text-[11px]">
                    <span className="text-slate-400">%A = %T · %G = %C · %A + %G = 50%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Khối lượng (M = N × 300)</span>
                    <span className="font-mono text-orange-300 font-semibold">
                      {stats.molecularMassDvc.toLocaleString('vi-VN')} amu (đvC)
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-fuchsia-300" />
                Lớp cấu trúc 3D
              </h3>
              <button
                onClick={() => handleSimulateGesture('RESET')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Mặc định
              </button>
            </div>

            <div className="space-y-1.5">
              {layerItems.map((item) => {
                const active = layerVisibility[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() =>
                      setLayerVisibility((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    role="switch"
                    aria-checked={active}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-white/[0.04] border-white/10'
                        : 'bg-transparent border-white/5 opacity-55 hover:opacity-80'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.dot, boxShadow: active ? `0 0 10px ${item.dot}` : 'none' }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-slate-100">{item.label}</span>
                      <span className="block text-[10.5px] text-slate-500 truncate">{item.sub}</span>
                    </span>
                    <span
                      className={`relative w-8 h-[18px] rounded-full shrink-0 transition-colors ${
                        active ? 'bg-cyan-400' : 'bg-white/10'
                      }`}
                    >
                      <motion.span
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow"
                        animate={{ left: active ? 16 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5 !text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                Thẻ tra cứu
              </span>
              <span className="text-[11px] font-mono text-slate-500">Vị trí #{activeInspect.stepIndex}</span>
            </div>

            <div className="flex items-start gap-3">
              <span
                className="grid place-items-center w-11 h-11 rounded-xl text-lg font-mono font-extrabold text-ink-950 shrink-0"
                style={{
                  backgroundColor: BASE_VISUAL_CONFIG[activeInspect.baseCode]?.colorHex || '#38BDF8',
                  boxShadow: `0 0 20px ${BASE_VISUAL_CONFIG[activeInspect.baseCode]?.colorHex || '#38BDF8'}66`
                }}
              >
                {activeInspect.baseCode}
              </span>
              <div className="text-sm font-bold text-white leading-snug">{activeInspect.titleVi}</div>
            </div>

            <dl className="panel-inset p-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400 flex items-center gap-1 shrink-0">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  Công thức
                </dt>
                <dd className="font-mono font-semibold text-cyan-200 text-right">
                  {activeInspect.chemicalFormula}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400 shrink-0">Liên kết hydrogen</dt>
                <dd className="font-mono font-bold text-amber-300 text-right">
                  {activeInspect.hydrogenBondCount === 0
                    ? `${activeInspect.baseCode} (mạch đơn / đơn phân)`
                    : `${activeInspect.baseCode} ${activeInspect.hydrogenBondCount === 2 ? '=' : '≡'} ${
                        activeInspect.partnerBaseCode
                      } (${activeInspect.hydrogenBondCount} lk)`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400 shrink-0">Phân nhóm</dt>
                <dd className="text-slate-200 text-right">{activeInspect.chemicalGroupVi}</dd>
              </div>
            </dl>

            <p className="text-xs text-slate-300 leading-relaxed">{activeInspect.ntbsRuleVi}</p>
          </div>
        </aside>
      </main>

      <ProposalAdvisorSection onSelectIdeaDemo={handleSelectIdeaDemo} />

      <footer className="border-t border-white/5 py-8 px-6 text-center space-y-1">
        <div className="text-sm font-semibold text-slate-300">
          BioMotion <span className="text-gradient">3D</span>
        </div>
        <p className="text-xs text-slate-500">
          Mô hình DNA Watson – Crick · DNA dạng phân tử · Nucleotide · So sánh DNA & mRNA — thuật ngữ
          theo SGK Sinh học 10, bộ Kết nối tri thức.
        </p>
      </footer>
    </div>
  );
}

export default App;
