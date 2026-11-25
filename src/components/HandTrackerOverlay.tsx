import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import {
  HandGestureEngine,
  HandGestureComputeOutput,
  NormalizedLandmark,
  GESTURE_LABELS_VI
} from '../services/handGestureEngine';
import { HandTelemetryState } from '../types/molecular';
import { Camera, CameraOff, Hand, Play, RefreshCw, Rotate3d } from 'lucide-react';

export type SimulatedGestureAction =
  | 'PALM_3D'
  | 'PEACE_TOP'
  | 'THUMBS_UP_UNZIP'
  | 'PINCH_ZOOM'
  | 'FIST_INERTIA'
  | 'POINT_INSPECT'
  | 'RESET';

interface HandTrackerOverlayProps {
  onGestureFrame: (output: HandGestureComputeOutput) => void;
  onVideoStreamChange: (stream: MediaStream | null) => void;
  onSimulateGesture: (type: SimulatedGestureAction) => void;
  virtualWristDeg: { pitch: number; yaw: number; roll: number };
  onVirtualWristChange: (deg: { pitch: number; yaw: number; roll: number }) => void;
  telemetry: HandTelemetryState;
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

export const HandTrackerOverlay: React.FC<HandTrackerOverlayProps> = ({
  onGestureFrame,
  onVideoStreamChange,
  onSimulateGesture,
  virtualWristDeg,
  onVirtualWristChange,
  telemetry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new HandGestureEngine());
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [wristSensitivity, setWristSensitivity] = useState<number>(1.65);

  const wristSensitivityRef = useRef(wristSensitivity);
  useEffect(() => {
    wristSensitivityRef.current = wristSensitivity;
  }, [wristSensitivity]);

  const initMediaPipeAndCamera = async () => {
    setModelLoading(true);
    setCameraError(null);

    try {
      if (!handLandmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
        );
        const makeOptions = (delegate: 'GPU' | 'CPU') => ({
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate
          },
          runningMode: 'VIDEO' as const,
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55
        });
        try {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, makeOptions('GPU'));
        } catch {
          handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, makeOptions('CPU'));
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      onVideoStreamChange(stream);
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể mở Camera. Bạn có thể dùng bộ Đồng Bộ Bàn Tay 3 Trục hoặc nút mô phỏng 6 cử chỉ bên dưới!';
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setModelLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    onVideoStreamChange(null);
    setCameraActive(false);
  };

  // Giải phóng camera khi component bị huỷ
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      const stream = video?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastVideoTime = -1;

    const detectLoop = () => {
      rafId = requestAnimationFrame(detectLoop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = handLandmarkerRef.current;

      if (!cameraActive || !video || !canvas || !landmarker || video.readyState < 2) {
        return;
      }

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const nowMs = performance.now();
        const result = landmarker.detectForVideo(video, nowMs);
        const landmarks = (result.landmarks || []) as NormalizedLandmark[][];

        const gestureOutput = engineRef.current.processHands(
          landmarks,
          wristSensitivityRef.current
        );

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          landmarks.forEach((hand) => {
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2.2;

            for (const [i1, i2] of HAND_CONNECTIONS) {
              const p1 = hand[i1];
              const p2 = hand[i2];
              ctx.beginPath();
              ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
              ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }

            // Highlight Palm 3D plane (Wrist 0 - IndexMCP 5 - PinkyMCP 17)
            ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
            ctx.beginPath();
            ctx.moveTo((1 - hand[0].x) * canvas.width, hand[0].y * canvas.height);
            ctx.lineTo((1 - hand[5].x) * canvas.width, hand[5].y * canvas.height);
            ctx.lineTo((1 - hand[17].x) * canvas.width, hand[17].y * canvas.height);
            ctx.closePath();
            ctx.fill();

            // Draw Thumb (#4) to Index (#8) Zoom Caliper Line
            const thumbPt = hand[4];
            const indexPt = hand[8];
            const tx = (1 - thumbPt.x) * canvas.width;
            const ty = thumbPt.y * canvas.height;
            const ix = (1 - indexPt.x) * canvas.width;
            const iy = indexPt.y * canvas.height;

            ctx.save();
            ctx.strokeStyle =
              gestureOutput.telemetry.primaryGesture === 'PINCH_ZOOM' ? '#F59E0B' : 'rgba(245, 158, 11, 0.45)';
            ctx.lineWidth = gestureOutput.telemetry.primaryGesture === 'PINCH_ZOOM' ? 3 : 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(ix, iy);
            ctx.stroke();
            ctx.restore();

            hand.forEach((pt, idx) => {
              const x = (1 - pt.x) * canvas.width;
              const y = pt.y * canvas.height;
              ctx.beginPath();
              ctx.arc(x, y, idx === 0 || idx === 4 || idx === 8 || idx === 12 ? 5.2 : 2.5, 0, Math.PI * 2);
              ctx.fillStyle =
                idx === 0
                  ? '#38BDF8'
                  : idx === 8
                  ? '#10B981'
                  : idx === 4
                  ? '#F59E0B'
                  : '#F8FAFC';
              ctx.fill();
            });
          });
        }

        onGestureFrame(gestureOutput);
      }
    };

    if (cameraActive) {
      rafId = requestAnimationFrame(detectLoop);
    }

    return () => cancelAnimationFrame(rafId);
  }, [cameraActive]);

  const activeGestureMeta = GESTURE_LABELS_VI[telemetry.primaryGesture];

  const rangeStyle = (value: number, min: number, max: number, color: string) =>
    ({
      '--range-fill': `${((value - min) / (max - min)) * 100}%`,
      '--range-color': color
    }) as React.CSSProperties;

  const axes = [
    { key: 'roll' as const, label: 'Nghiêng cổ tay', axis: 'Roll · Z', min: -90, max: 90, color: '#fbbf24' },
    { key: 'pitch' as const, label: 'Úp / ngửa tay', axis: 'Pitch · X', min: -90, max: 90, color: '#34d399' },
    { key: 'yaw' as const, label: 'Xoay lòng bàn tay', axis: 'Yaw · Y', min: -180, max: 180, color: '#22d3ee' }
  ];

  const simButtons: { id: SimulatedGestureAction; icon: string; label: string; ring: string }[] = [
    { id: 'PALM_3D', icon: '✋', label: 'Xoè tay · xoay 3D', ring: 'hover:border-cyan-400/60' },
    { id: 'PEACE_TOP', icon: '✌️', label: 'Chữ V · nhìn đỉnh', ring: 'hover:border-sky-400/60' },
    { id: 'THUMBS_UP_UNZIP', icon: '👍', label: 'Ngón cái · tách', ring: 'hover:border-orange-400/60' },
    { id: 'PINCH_ZOOM', icon: '👌', label: 'Cái + trỏ · zoom', ring: 'hover:border-amber-400/60' },
    { id: 'FIST_INERTIA', icon: '✊', label: 'Nắm tay · quán tính', ring: 'hover:border-fuchsia-400/60' },
    { id: 'POINT_INSPECT', icon: '👉', label: 'Ngón trỏ · tra cứu', ring: 'hover:border-emerald-400/60' }
  ];

  const gestureToSim: Partial<Record<string, SimulatedGestureAction>> = {
    PALM_3D_ORIENTATION: 'PALM_3D',
    PEACE_TOP_VIEW: 'PEACE_TOP',
    THUMBS_UP_UNZIP: 'THUMBS_UP_UNZIP',
    PINCH_ZOOM: 'PINCH_ZOOM',
    FIST_INERTIA_GRAB: 'FIST_INERTIA',
    POINT_INSPECT: 'POINT_INSPECT'
  };
  const activeSim = gestureToSim[telemetry.primaryGesture];

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-cyan-400/10 text-cyan-300 shrink-0">
            <Hand className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight">Điều khiển bằng tay</h3>
            <p className="text-[11px] text-slate-400 truncate">6 cử chỉ · MediaPipe</p>
          </div>
        </div>
        <button
          onClick={cameraActive ? stopCamera : initMediaPipeAndCamera}
          disabled={modelLoading}
          className={`btn shrink-0 ${cameraActive ? 'btn-danger' : 'btn-primary'}`}
        >
          {modelLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Đang nạp…
            </>
          ) : cameraActive ? (
            <>
              <CameraOff className="w-3.5 h-3.5" />
              Tắt
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              Bật camera
            </>
          )}
        </button>
      </div>

      {/* Khung camera */}
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-[radial-gradient(ellipse_at_center,#0f1a33,#05070f)]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'opacity-80' : 'hidden'}`}
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
            <div className="relative mb-3">
              <span className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl" />
              <span className="relative grid place-items-center w-14 h-14 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-2xl">
                ✋
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">
              Bật camera để xoay mô hình bằng lòng bàn tay và phóng to bằng ngón cái + ngón trỏ
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Hoặc dùng thanh trượt và nút mô phỏng bên dưới</p>
          </div>
        )}

        <div className="absolute top-2 left-2 right-2 flex items-center gap-2 text-[11px] font-medium bg-ink-950/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-white/10">
          {cameraActive && <span className="live-dot shrink-0" />}
          <span className={`truncate ${activeGestureMeta.badgeColor}`}>
            {activeGestureMeta.icon}{' '}
            {telemetry.primaryGesture === 'IDLE' ? 'Đang chờ cử chỉ…' : activeGestureMeta.shortTitle}
          </span>
        </div>

        <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 text-center text-[10px] font-mono bg-ink-950/80 backdrop-blur py-1 rounded-lg border border-white/10">
          <span className="text-amber-300">Z {telemetry.handRollDeg}°</span>
          <span className="text-emerald-300">X {telemetry.handPitchDeg}°</span>
          <span className="text-cyan-300">{telemetry.zoomLevelNormalized.toFixed(2)}×</span>
        </div>
      </div>

      {cameraError && (
        <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {cameraError}
        </div>
      )}

      {/* Mô phỏng cử chỉ */}
      <div className="space-y-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
          <Play className="w-3 h-3 text-cyan-400" />
          Thử nhanh từng cử chỉ
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {simButtons.map((b) => {
            const active = activeSim === b.id;
            return (
              <button
                key={b.id}
                onClick={() => onSimulateGesture(b.id)}
                title={b.label}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl border text-[10.5px] leading-tight text-center cursor-pointer transition-all ${
                  active
                    ? 'bg-cyan-400/15 border-cyan-400/60 text-white'
                    : `bg-white/[0.03] border-white/10 text-slate-300 ${b.ring}`
                }`}
              >
                <span className="text-lg leading-none">{b.icon}</span>
                <span>{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bộ đồng bộ góc bàn tay */}
      <div className="space-y-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />
            Góc bàn tay ảo
          </span>
          <button
            onClick={() => onVirtualWristChange({ pitch: 0, yaw: 0, roll: 0 })}
            className="text-[10.5px] font-mono text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            Đặt về 0°
          </button>
        </div>

        {axes.map((a) => (
          <div key={a.key} className="space-y-1.5">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">
                {a.label} <span className="font-mono text-slate-600">· {a.axis}</span>
              </span>
              <span className="font-mono" style={{ color: a.color }}>
                {virtualWristDeg[a.key]}°
              </span>
            </div>
            <input
              type="range"
              min={a.min}
              max={a.max}
              value={virtualWristDeg[a.key]}
              onChange={(e) =>
                onVirtualWristChange({ ...virtualWristDeg, [a.key]: parseInt(e.target.value, 10) })
              }
              className="range"
              style={rangeStyle(virtualWristDeg[a.key], a.min, a.max, a.color)}
              aria-label={a.label}
            />
          </div>
        ))}

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10.5px]">
            <span className="text-slate-400">Độ nhạy camera</span>
            <span className="font-mono text-cyan-300">{wristSensitivity.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={2.6}
            step={0.1}
            value={wristSensitivity}
            onChange={(e) => setWristSensitivity(parseFloat(e.target.value))}
            className="range"
            style={rangeStyle(wristSensitivity, 0.8, 2.6, '#a78bfa')}
            aria-label="Độ nhạy camera"
          />
        </div>
      </div>
    </div>
  );
};
