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
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55
        });
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

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-cyan-400 shrink-0" />
          <h3 className="text-xs font-semibold text-slate-100">
            6 Cử Chỉ Bàn Tay Cầm DNA (MediaPipe)
          </h3>
        </div>
        <button
          onClick={cameraActive ? stopCamera : initMediaPipeAndCamera}
          disabled={modelLoading}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            cameraActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
        >
          {modelLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang nạp AI...</span>
            </>
          ) : cameraActive ? (
            <>
              <CameraOff className="w-3.5 h-3.5" />
              <span>Tắt Camera</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              <span>Bật Camera Cử Chỉ</span>
            </>
          )}
        </button>
      </div>

      {/* Camera Preview Box */}
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-md overflow-hidden border border-slate-800/90">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'opacity-75' : 'hidden'}`}
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <Rotate3d className="w-7 h-7 text-cyan-400/75 mb-2" />
            <p className="text-xs text-slate-200 font-medium">
              Bấm &ldquo;Bật Camera Cử Chỉ&rdquo; để xoay 3D bằng lòng bàn tay & Zoom bằng khoảng cách Ngón Cái + Ngón Trỏ
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hoặc dùng thanh trượt Roll / Pitch / Yaw và 6 nút cử chỉ ngay bên dưới.
            </p>
          </div>
        )}

        {/* Live Active Gesture Badge inside Camera View */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800">
          <span className={`font-semibold truncate ${activeGestureMeta.badgeColor}`}>
            {activeGestureMeta.icon}{' '}
            {telemetry.primaryGesture === 'IDLE'
              ? 'Chờ cử chỉ tay...'
              : activeGestureMeta.title.replace(/^[^\s]+\s/, '')}
          </span>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
          <span>ROLL(Z): {telemetry.handRollDeg}°</span>
          <span>PITCH(X): {telemetry.handPitchDeg}°</span>
          <span>ZOOM(Cái-Trỏ): {telemetry.zoomLevelNormalized.toFixed(2)}x</span>
        </div>
      </div>

      {cameraError && (
        <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded px-2.5 py-1.5">
          {cameraError}
        </div>
      )}

      {/* ✋ Palm 3D Orientation Controls (Roll Z, Pitch X, Yaw Y) */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-300 font-medium flex items-center gap-1">
            <Rotate3d className="w-3.5 h-3.5 text-cyan-400" />
            <span>Độ nhạy đồng bộ bàn tay:</span>
          </span>
          <span className="font-mono text-cyan-300 font-semibold">{wristSensitivity.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.8}
          max={2.6}
          step={0.1}
          value={wristSensitivity}
          onChange={(e) => setWristSensitivity(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
        />

        {/* Interactive 3-Axis Palm Orientation Sliders (Roll Z, Pitch X, Yaw Y) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-md p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-200">✋ Đồng Bộ Góc Nghiêng Bàn Tay (3D):</span>
            <button
              onClick={() => onVirtualWristChange({ pitch: 0, yaw: 0, roll: 0 })}
              className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
            >
              Đặt thẳng (0°)
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Nghiêng cổ tay trái/phải (Roll - Trục Z):</span>
              <span className="text-amber-300">{virtualWristDeg.roll}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={virtualWristDeg.roll}
              onChange={(e) =>
                onVirtualWristChange({ ...virtualWristDeg, roll: parseInt(e.target.value, 10) })
              }
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Úp/ngửa bàn tay (Pitch - Trục X):</span>
              <span className="text-emerald-300">{virtualWristDeg.pitch}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={virtualWristDeg.pitch}
              onChange={(e) =>
                onVirtualWristChange({ ...virtualWristDeg, pitch: parseInt(e.target.value, 10) })
              }
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Xoay lòng bàn tay 360° (Yaw - Trục Y):</span>
              <span className="text-cyan-300">{virtualWristDeg.yaw}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={virtualWristDeg.yaw}
              onChange={(e) =>
                onVirtualWristChange({ ...virtualWristDeg, yaw: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-900 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 6 Gesture Simulator Buttons */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="text-[11px] text-slate-300 mb-2 flex items-center gap-1.5 font-medium">
          <Play className="w-3 h-3 text-cyan-400" />
          <span>Mô phỏng nhanh 6 cử chỉ bàn tay:</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onSimulateGesture('PALM_3D')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-cyan-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            ✋ Xòe Tay (Roll/Pitch/Yaw)
          </button>
          <button
            onClick={() => onSimulateGesture('PEACE_TOP')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-sky-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            ✌️ Chữ V (Nhìn Từ Đỉnh)
          </button>
          <button
            onClick={() => onSimulateGesture('THUMBS_UP_UNZIP')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-orange-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            👍 Ngón Cái (Tách Mạch/Nu)
          </button>
          <button
            onClick={() => onSimulateGesture('PINCH_ZOOM')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-amber-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            👌 Cái + Trỏ (Zoom Ra/Vào)
          </button>
          <button
            onClick={() => onSimulateGesture('FIST_INERTIA')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-fuchsia-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            ✊ Nắm Tay (Xoay Quán Tính)
          </button>
          <button
            onClick={() => onSimulateGesture('POINT_INSPECT')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-[11px] text-emerald-300 font-medium text-left transition-colors whitespace-nowrap truncate cursor-pointer"
          >
            👉 1 Ngón Trỏ (Thẻ A,T,G,C,U)
          </button>
        </div>
      </div>
    </div>
  );
};
