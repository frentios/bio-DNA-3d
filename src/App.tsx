import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Eye,
  EyeOff,
  RotateCcw,
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
    setCameraWristEuler(output.targetWristEuler);
    setInertiaImpulse(output.inertiaImpulse);
    setHandZoomFactor(output.targetZoomFactor);

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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 1-row, 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/90 bg-[#0B0F19]/95 sticky top-0 z-40 backdrop-blur-md">
        <a
          href="#workbench"
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          BioMotion 3D
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('WATSON_CRICK_DNA')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'WATSON_CRICK_DNA' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            DNA Watson-Crick
          </button>
          <button
            onClick={() => setActiveTab('MOLECULAR_DNA')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'MOLECULAR_DNA' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            DNA Dạng Phân Tử
          </button>
          <button
            onClick={() => setActiveTab('NUCLEOTIDE_STRUCTURE')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'NUCLEOTIDE_STRUCTURE' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            Cấu Trúc Nucleotide
          </button>
          <button
            onClick={() => setActiveTab('DNA_VS_MRNA')}
            className={`hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'DNA_VS_MRNA' ? 'text-cyan-400 font-semibold' : ''
            }`}
          >
            So Sánh DNA & mRNA
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={toggleFullScreen}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Tràn Màn Hình 3D</span>
          </button>

          <button
            onClick={() => setArPassthrough((prev) => !prev)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              arPassthrough
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {arPassthrough ? 'Thoát AR Camera' : 'Đặt Lên Bàn Học (AR)'}
          </button>
        </div>
      </header>

      {/* 4 Model Tabs Bar + Sequence Preset Selector */}
      <div
        id="workbench"
        className="border-b border-slate-800/80 bg-[#0F1626] px-6 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3"
      >
        {/* 4 Interactive Model Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
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
                className={`px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span
                  className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                    isActive ? 'bg-cyan-400 text-slate-950' : 'bg-slate-900 text-cyan-400'
                  }`}
                >
                  {getTabIcon(tab.id)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-cyan-300' : 'text-slate-100'
                      }`}
                    >
                      {tab.shortTitle}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{tab.badge}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sequence Presets (for DNA & mRNA tabs) */}
        {activeTab !== 'NUCLEOTIDE_STRUCTURE' && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mẫu gen:</span>
            </span>
            {HIGH_SCHOOL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activePresetId === preset.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {preset.badge}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 3-Column Interactive Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* LEFT COLUMN (3 cols): 6-Gesture Camera + 3-Axis Palm Gimbal + Unzipping & View Angles */}
        <aside className="lg:col-span-3 space-y-4 flex flex-col">
          <HandTrackerOverlay
            onGestureFrame={handleGestureFrame}
            onVideoStreamChange={setVideoStream}
            onSimulateGesture={handleSimulateGesture}
            virtualWristDeg={virtualWristDeg}
            onVirtualWristChange={(deg) => {
              setUseVirtualWrist(true);
              setAutoRotate(false);
              setVirtualWristDeg(deg);
            }}
            telemetry={telemetry}
          />

          {/* 👍 Thumbs-Up Unzipping / Nucleotide Separation & 👌 Thumb-Index Zoom Slider */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <SplitSquareHorizontal className="w-4 h-4 text-orange-400" />
                  <span>
                    {activeTab === 'NUCLEOTIDE_STRUCTURE'
                      ? '👍 Tách 3 Thành Phần Nucleotide'
                      : '👍 Tháo Xoắn / Tách Đôi 2 Mạch Đơn'}
                  </span>
                </span>
                <span className="font-mono tabular-nums text-orange-300 font-bold">
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
                className="w-full accent-orange-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0% (Nguyên vẹn)</span>
                <span>50% (Bắt đầu tách)</span>
                <span>100% (Tách rời hoàn toàn)</span>
              </div>
            </div>

            {/* 👌 Manual / Simulated Thumb-Index Span Zoom Slider */}
            <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold">
                  👌 Độ Phóng Đại (Khoảng Cách Cái + Trỏ):
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {(handZoomFactor || 1.0).toFixed(2)}x
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
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>0.55x (Chụm 2 ngón)</span>
                <span>1.0x (Chuẩn)</span>
                <span>2.45x (Mở rộng 2 ngón)</span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Góc Nhìn Nhanh (✋ / ✌️ / 👌)</span>
                </span>
                <button
                  onClick={() => setAutoRotate((prev) => !prev)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border cursor-pointer ${
                    autoRotate
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {autoRotate ? 'Tự xoay: BẬT' : 'Đồng bộ tay 1:1'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: 'FRONT_HELIX',
                    label: '✋ Đặt Thẳng Chính Diện',
                    wrist: { pitch: 0, yaw: 0, roll: 0 }
                  },
                  {
                    id: 'TOP_AXIS',
                    label: '✌️ Nhìn Từ Đỉnh (Chữ V)',
                    wrist: { pitch: 90, yaw: 0, roll: 0 }
                  },
                  {
                    id: 'SINGLE_TURN_34A',
                    label: '✋ Nghiêng Tay 3 Trục',
                    wrist: { pitch: 20, yaw: 35, roll: -14 }
                  },
                  {
                    id: 'BASE_PAIR_ZOOM',
                    label: '👌 Zoom Sát Liên Kết',
                    wrist: { pitch: 12, yaw: 18, roll: 0 }
                  }
                ].map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setAutoRotate(false);
                      setUseVirtualWrist(true);
                      setVirtualWristDeg(view.wrist);
                      setCameraOrientation(view.id as HandCameraOrientation);
                    }}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                      cameraOrientation === view.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER VIEWPORT (6 cols): 3D Viewport (Supports Full-Screen Expansion!) + Contextual Panel */}
        <section className="lg:col-span-6 flex flex-col gap-3">
          <div
            className={
              isFullScreen
                ? 'fixed inset-0 z-50 w-screen h-screen bg-[#070B14]'
                : 'relative flex-1 min-h-[500px] lg:min-h-[560px] rounded-lg overflow-hidden border border-slate-800'
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

          {/* Contextual Bottom Panel Based on Active Tab */}
          {activeTab === 'NUCLEOTIDE_STRUCTURE' ? (
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Hexagon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">
                    Cấu Tạo 3 Tiểu Phần Của 1 Đơn Phân Nucleotide (Chọn loại Bazơ để quan sát 3D):
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['A', 'T', 'G', 'C', 'U'] as NucleotideCode[]).map((base) => {
                    const cfg = BASE_VISUAL_CONFIG[base];
                    const active = selectedNucleotideBase === base;
                    return (
                      <button
                        key={base}
                        onClick={() => setSelectedNucleotideBase(base)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-all ${
                          active
                            ? 'text-slate-950 scale-105'
                            : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-600'
                        }`}
                        style={active ? { backgroundColor: cfg.colorHex } : undefined}
                      >
                        {base === 'U' ? 'U (Uracil - RNA)' : `${base} (${cfg.englishName})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-slate-950/90 border border-orange-500/30 rounded-md p-2.5 space-y-1">
                  <div className="font-mono font-bold text-orange-300">
                    ① Nhóm Photphat (-PO₄³⁻)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Gắn vào Carbon <strong>C5&apos;</strong> của đường qua liên kết este, nối với C3&apos;-OH của nu kế tiếp tạo khung xương.
                  </p>
                </div>
                <div className="bg-slate-950/90 border border-cyan-500/30 rounded-md p-2.5 space-y-1">
                  <div className="font-mono font-bold text-cyan-300">
                    ② Đường Pentozơ 5 Carbon
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {selectedNucleotideBase === 'U'
                      ? 'Đường Ribose (C₅H₁₀O₅): Có nhóm -OH ở C2\' (đặc trưng của mRNA).'
                      : 'Đường Deoxyribose (C₅H₁₀O₄): Chỉ có -H ở C2\' (mất 1 Oxy nên bền vững).'}
                  </p>
                </div>
                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-md p-2.5 space-y-1">
                  <div className="font-mono font-bold text-emerald-300">
                    ③ Bazơ Nitơ ({selectedNucleotideBase} · {BASE_VISUAL_CONFIG[selectedNucleotideBase].nucleotideFormula})
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {BASE_VISUAL_CONFIG[selectedNucleotideBase].groupType}. Gắn với đường tại Carbon <strong>C1&apos;</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              id="sequence-builder"
              className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Dna className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    {activeTab === 'DNA_VS_MRNA'
                      ? 'Đối Chiếu Trình Tự 2 Mạch DNA & Mạch Đơn mRNA Phiên Mã (Thay T bằng U):'
                      : 'Các Bậc Thang Bổ Sung (Bấm vào cột bất kỳ để đổi cặp A=T ↔ G≡C):'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sequenceStrand1}
                    onChange={(e) => {
                      setSequenceStrand1(e.target.value);
                      setActivePresetId('CUSTOM');
                    }}
                    placeholder="Nhập mạch 1 (A,T,G,C)..."
                    maxLength={24}
                    className="w-44 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-2.5 py-1 text-xs font-mono text-white uppercase focus:outline-none"
                  />
                  <button
                    onClick={() => handleCycleBaseAtStep(4)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-xs font-medium text-amber-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Đổi bậc #5</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="inline-flex items-center gap-1.5 min-w-full">
                  <div className="flex flex-col justify-between text-[11px] font-mono text-slate-400 pr-2 shrink-0 space-y-1">
                    <span className="text-sky-400 font-semibold">DNA Mạch 1 (5&apos;→3&apos;):</span>
                    <span className="text-slate-500 text-[10px]">Liên kết H:</span>
                    <span className="text-purple-400 font-semibold">DNA Mạch gốc (3&apos;→5&apos;):</span>
                    {activeTab === 'DNA_VS_MRNA' && (
                      <span className="text-fuchsia-400 font-semibold pt-0.5">
                        mRNA Phiên mã (5&apos;→3&apos;):
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
                      <button
                        key={step.stepIndex}
                        onClick={() => handleCycleBaseAtStep(idx)}
                        title={`Bậc ${step.stepIndex}: Bấm để đổi ${step.strand1Base}-${step.strand2Base}`}
                        className={`flex flex-col items-center px-2 py-1.5 rounded-md border transition-transform cursor-pointer shrink-0 ${
                          isHighlighted
                            ? 'bg-slate-800 border-amber-400 scale-105'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-[9px] font-mono text-slate-500 mb-0.5">
                          #{step.stepIndex}
                        </span>
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold text-slate-950"
                          style={{ backgroundColor: cfg1.colorHex }}
                        >
                          {step.strand1Base}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 my-0.5 font-bold">
                          {step.hydrogenBonds === 2 ? '‖(2)' : '||| (3)'}
                        </span>
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold text-slate-950"
                          style={{ backgroundColor: cfg2.colorHex }}
                        >
                          {step.strand2Base}
                        </span>
                        {activeTab === 'DNA_VS_MRNA' && (
                          <span
                            className="w-6 h-6 mt-1 rounded flex items-center justify-center text-xs font-mono font-bold text-white border border-white/30"
                            style={{ backgroundColor: cfgMrna.colorHex }}
                          >
                            {step.mrnaBase}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (3 cols): Contextual Comparison Table OR Formula Calculator + Layer Toggles + Pointed Card */}
        <aside className="lg:col-span-3 space-y-4 flex flex-col">
          {activeTab === 'DNA_VS_MRNA' ? (
            <div className="bg-[#111827] border border-purple-500/40 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <GitCompare className="w-4 h-4" />
                  <span>BẢNG SO SÁNH TRỰC TIẾP DNA & mRNA</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-300">
                  U = {stats.countMrnaU} nu
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {DNA_VS_MRNA_COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.criterion}
                    className="bg-slate-950/85 border border-slate-800 rounded-md p-2.5 space-y-1"
                  >
                    <div className="font-mono font-semibold text-slate-300 text-[11px]">
                      {row.criterion}
                    </div>
                    <div className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="text-sky-300">
                        <strong>DNA:</strong> {row.dnaValue}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="text-purple-300">
                        <strong>mRNA:</strong> {row.mrnaValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <Calculator className="w-4 h-4" />
                  <span>THÔNG SỐ CẤU TRÚC PHÂN TỬ DNA</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                  {activePreset.badge}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{activePreset.description}</p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-md p-2.5">
                  <div className="text-[10px] font-mono text-slate-400">TỔNG SỐ NU (N = 2A + 2G)</div>
                  <div className="text-xl font-mono font-bold text-white tabular-nums mt-0.5">
                    {stats.totalNucleotides}{' '}
                    <span className="text-xs font-normal text-slate-400">nu ({stats.totalPairs} cặp)</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-md p-2.5">
                  <div className="text-[10px] font-mono text-slate-400">CHIỀU DÀI (L = N/2 × 3,4)</div>
                  <div className="text-xl font-mono font-bold text-cyan-400 tabular-nums mt-0.5">
                    {stats.lengthAngstrom} <span className="text-xs font-normal text-slate-400">Å</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-md p-2.5">
                  <div className="text-[10px] font-mono text-slate-400">LIÊN KẾT HYDRO (2A + 3G)</div>
                  <div className="text-xl font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                    {stats.hydrogenBondsTotal}{' '}
                    <span className="text-xs font-normal text-slate-400">liên kết</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-md p-2.5">
                  <div className="text-[10px] font-mono text-slate-400">SỐ CHU KỲ XOẮN (C = N/20)</div>
                  <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                    {stats.helicalTurns}{' '}
                    <span className="text-xs font-normal text-slate-400">vòng</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/70 rounded-md p-2.5 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-emerald-400">Số lượng A = T (2 lk H):</span>
                  <span className="text-white font-semibold tabular-nums">
                    {stats.countA} nu ({stats.percentAT}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Số lượng G ≡ C (3 lk H):</span>
                  <span className="text-white font-semibold tabular-nums">
                    {stats.countG} nu ({stats.percentGC}%)
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-1">
                  <span className="text-slate-400">Khối lượng (M = N × 300):</span>
                  <span className="text-orange-300 font-semibold tabular-nums">
                    {stats.molecularMassDvc.toLocaleString('vi-VN')} đvC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Toggle 3D Model Parts */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Bật / Tắt Lớp Cấu Trúc 3D</span>
              </h3>
              <button
                onClick={() => handleSimulateGesture('RESET')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Mặc định</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  key: 'sgkRuler3D' as const,
                  label: 'Trục Tâm, Bảng Tên & Thước Đo 34 Å',
                  sub: 'Hiển thị thanh trục giữa & nhãn định danh mô hình',
                  color: 'text-cyan-300'
                },
                {
                  key: 'baseLabels3D' as const,
                  label: 'Nhãn Chữ Cái A, T, G, C, U & Nguyên Tử',
                  sub: 'Giúp nhận biết nhanh từng loại nucleotide & vị trí C1\'→C5\'',
                  color: 'text-emerald-300'
                },
                {
                  key: 'backbone' as const,
                  label: 'Khung Xương Đường Pentozơ - Photphat (-PO₄³⁻)',
                  sub: 'Dải băng xoắn 5\'→3\' hoặc cụm nguyên tử P - O - Đường 5C',
                  color: 'text-sky-300'
                },
                {
                  key: 'hydrogenBonds' as const,
                  label: 'Cầu Nối Liên Kết Hydro & Glycosidic',
                  sub: 'Dùng Cái + Trỏ (👌) để Zoom sát hoặc 👍 để tháo xoắn',
                  color: 'text-amber-300'
                }
              ].map((item) => {
                const active = layerVisibility[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() =>
                      setLayerVisibility((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900/95 border-slate-700 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="pr-2">
                      <div className={`text-xs font-semibold ${active ? item.color : 'text-slate-500'}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.sub}</div>
                    </div>
                    {active ? (
                      <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 👉 Synchronized Explanation Card for Pointed / Selected Nucleotide (A, T, G, C, U + Chemical Formula) */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg p-4 space-y-2.5 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>👉 THẺ THÔNG SỐ PHÂN TỬ ĐANG TRỎ</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                Vị trí #{activeInspect.stepIndex}
              </span>
            </div>

            <div className="text-sm font-bold text-white">{activeInspect.titleVi}</div>

            <div className="space-y-1.5 text-xs bg-slate-950/80 p-2.5 rounded border border-slate-800">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1 shrink-0">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Công thức:</span>
                </span>
                <span className="font-mono font-semibold text-cyan-300 text-right">
                  {activeInspect.chemicalFormula}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">Liên kết Hydro:</span>
                <span className="font-mono font-bold text-amber-300 text-right">
                  {activeInspect.hydrogenBondCount === 0
                    ? `${activeInspect.baseCode} (Mạch đơn / Đơn phân)`
                    : `${activeInspect.baseCode} ${
                        activeInspect.hydrogenBondCount === 2 ? '= (2 lk Hydro)' : '≡ (3 lk Hydro)'
                      } ${activeInspect.partnerBaseCode}`}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">Phân nhóm:</span>
                <span className="font-mono text-slate-200 text-right">
                  {activeInspect.chemicalGroupVi}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 pt-1 leading-relaxed">
              {activeInspect.ntbsRuleVi}
            </p>
          </div>
        </aside>
      </main>

      <ProposalAdvisorSection onSelectIdeaDemo={handleSelectIdeaDemo} />

      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-400">
        BioMotion 3D · 4 Mô Hình Sinh Học Phân Tử 3D (DNA Watson-Crick · DNA Phân Tử · Đơn Phân Nucleotide · So Sánh DNA & mRNA) — Điều Khiển Bằng Cử Chỉ Bàn Tay Thời Gian Thực.
      </footer>
    </div>
  );
}

export default App;
