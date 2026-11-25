import { ActiveGestureType, HandTelemetryState } from '../types/molecular';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandGestureComputeOutput {
  telemetry: HandTelemetryState;
  /** ✋ Góc Euler 3D của lòng bàn tay (Pitch X, Yaw Y, Roll Z, radian) */
  targetWristEuler: { x: number; y: number; z: number } | null;
  /** ✊ Xung vận tốc góc khi nắm tay kéo rê */
  inertiaImpulse: { x: number; y: number } | null;
  /** 👌 Hệ số zoom do khoảng cách ngón cái – ngón trỏ */
  targetZoomFactor: number | null;
  /** 👍 Mức tách mạch khi giơ ngón cái */
  targetUnzipFactor: number | null;
  /** ✌️ Chuyển sang góc nhìn từ đỉnh */
  detectedCameraPreset: 'TOP_AXIS' | null;
}

type Vec3 = { x: number; y: number; z: number };

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const dist2D = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Bộ lọc One-Euro (Casiez et al., 2012): làm mượt mạnh khi tay đứng yên,
 * giảm độ trễ khi tay chuyển động nhanh. Không phụ thuộc tốc độ khung hình.
 */
class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev = 0;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.4,
    private dCutoff = 1.0
  ) {}

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, tMs: number): number {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = tMs;
      return x;
    }
    const dt = Math.max(1e-3, (tMs - this.tPrev) / 1000);
    this.tPrev = tMs;
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    this.dxPrev = this.dxPrev + aD * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxPrev);
    const a = this.alpha(cutoff, dt);
    this.xPrev = this.xPrev + a * (x - this.xPrev);
    return this.xPrev;
  }

  value() {
    return this.xPrev ?? 0;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
  }
}

/** Số khung hình liên tiếp một cử chỉ mới phải giữ ổn định trước khi được chấp nhận */
const GESTURE_HOLD_FRAMES = 4;
/** Ngưỡng khoảng cách (đã chuẩn hoá theo cỡ lòng bàn tay) để "chụm" ngón cái + ngón trỏ bắt đầu zoom */
const PINCH_ENGAGE_SPAN = 0.22;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.45;
/** Hệ số đổi khoảng mở ngón → zoom (giữ nguyên độ nhạy như bản cũ: 1,9× zoom cho 1,17 đơn vị span) */
const ZOOM_PER_SPAN = (ZOOM_MAX - ZOOM_MIN) / (1.35 - 0.18);

interface HandFeatures {
  wrist: Vec3;
  thumbTip: Vec3;
  indexTip: Vec3;
  span: number;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  fourFingersCurled: boolean;
  isThumbsUp: boolean;
  thumbAwayFromPalm: boolean;
}

export class HandGestureEngine {
  private filters = { pitch: new OneEuroFilter(), yaw: new OneEuroFilter(), roll: new OneEuroFilter() };
  private prevAcross: Vec3 | null = null;
  private currentZoomNormalized = 1.0;

  // Chống nhấp nháy
  private committedGesture: ActiveGestureType = 'IDLE';
  private candidateGesture: ActiveGestureType = 'IDLE';
  private candidateFrames = 0;

  // Trạng thái zoom
  private zoomEngaged = false;
  private zoomEngageSpan = 0;
  private zoomAtEngage = 1;

  // Quán tính nắm tay
  private prevWristPos: Vec3 | null = null;
  private prevTimeMs = 0;

  public processHands(
    multiHandLandmarks: NormalizedLandmark[][],
    wristSensitivity = 1.65,
    timestampMs: number = performance.now()
  ): HandGestureComputeOutput {
    if (multiHandLandmarks.length === 0) {
      this.resetTracking();
      return this.buildOutput('IDLE', 0, null, { pitch: 0, yaw: 0, roll: 0 });
    }

    const hand = multiHandLandmarks[0];
    // Lật trục X để chuyển động trước webcam khớp với trái/phải trên màn hình
    const p = (i: number): Vec3 => ({ x: 1 - hand[i].x, y: hand[i].y, z: hand[i].z });

    const features = this.extractFeatures(p);
    const angles = this.computePalmAngles(p, wristSensitivity, timestampMs);

    // 1. Phân loại thô cho khung hình này
    const raw = this.classify(features);

    // 2. Chống nhấp nháy: cử chỉ mới phải giữ đủ số khung hình
    if (raw === this.committedGesture) {
      this.candidateGesture = raw;
      this.candidateFrames = 0;
    } else if (raw === this.candidateGesture) {
      this.candidateFrames += 1;
      if (this.candidateFrames >= GESTURE_HOLD_FRAMES) {
        this.onGestureChange(this.committedGesture, raw, features);
        this.committedGesture = raw;
        this.candidateFrames = 0;
      }
    } else {
      this.candidateGesture = raw;
      this.candidateFrames = 1;
    }

    return this.buildOutput(this.committedGesture, multiHandLandmarks.length, features, angles, timestampMs);
  }

  /** Đặt lại khi mất dấu bàn tay */
  private resetTracking() {
    this.prevWristPos = null;
    this.prevAcross = null;
    this.zoomEngaged = false;
    this.committedGesture = 'IDLE';
    this.candidateGesture = 'IDLE';
    this.candidateFrames = 0;
    this.filters.pitch.reset();
    this.filters.yaw.reset();
    this.filters.roll.reset();
  }

  private extractFeatures(p: (i: number) => Vec3): HandFeatures {
    const wrist = p(0);
    const thumbIp = p(3);
    const thumbTip = p(4);
    const indexMcp = p(5);
    const indexPip = p(6);
    const indexTip = p(8);
    const middleMcp = p(9);
    const middlePip = p(10);
    const middleTip = p(12);
    const ringPip = p(14);
    const ringTip = p(16);
    const pinkyPip = p(18);
    const pinkyTip = p(20);

    // Cỡ lòng bàn tay làm thước đo → không phụ thuộc khoảng cách tay tới camera
    const palm = Math.max(0.075, dist2D(wrist, middleMcp));
    const span = dist2D(thumbTip, indexTip) / palm;

    const indexExtended = dist2D(indexTip, wrist) > dist2D(indexPip, wrist) * 1.14;
    const middleExtended = dist2D(middleTip, wrist) > dist2D(middlePip, wrist) * 1.15;
    const ringExtended = dist2D(ringTip, wrist) > dist2D(ringPip, wrist) * 1.12;
    const pinkyExtended = dist2D(pinkyTip, wrist) > dist2D(pinkyPip, wrist) * 1.12;
    const fourFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    const thumbToIndexMcp = dist2D(thumbTip, indexMcp) / palm;
    const thumbToMiddlePip = dist2D(thumbTip, middlePip) / palm;

    const isThumbsUp =
      fourFingersCurled &&
      thumbTip.y < thumbIp.y - 0.015 &&
      thumbTip.y < indexPip.y &&
      thumbToIndexMcp > 0.62;

    return {
      wrist,
      thumbTip,
      indexTip,
      span,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended,
      fourFingersCurled,
      isThumbsUp,
      thumbAwayFromPalm: thumbToMiddlePip > 0.58
    };
  }

  /**
   * Góc nghiêng chỉ lấy từ HƯỚNG của lòng bàn tay (không lấy vị trí tay trên màn hình):
   *  - up     = cổ tay → gốc ngón giữa
   *  - across = gốc ngón trỏ → gốc ngón út (đổi dấu liên tục nên dùng được cho cả tay trái và tay phải)
   */
  private computePalmAngles(p: (i: number) => Vec3, sensitivity: number, tMs: number) {
    // Hệ toạ độ thuận: X sang phải, Y lên trên, Z hướng về phía camera
    const toWorld = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
    const wrist = toWorld(p(0));
    const indexMcp = toWorld(p(5));
    const middleMcp = toWorld(p(9));
    const pinkyMcp = toWorld(p(17));

    const up = norm(sub(middleMcp, wrist));
    let across = sub(pinkyMcp, indexMcp);
    across = norm(sub(across, scale(up, dot(across, up)))); // trực giao hoá với up

    // Tay trái và tay phải có "across" ngược chiều → chọn chiều gần nhất với khung trước,
    // lần đầu thì quy về hướng +X. Nhờ vậy góc không bị nhảy 180°.
    const ref = this.prevAcross ?? { x: 1, y: 0, z: 0 };
    if (dot(across, ref) < 0) across = scale(across, -1);
    this.prevAcross = across;

    const rawRoll = -Math.atan2(up.x, up.y); // nghiêng cổ tay trái/phải
    const rawPitch = Math.atan2(up.z, Math.hypot(up.x, up.y)); // úp/ngửa về phía camera
    const rawYaw = Math.atan2(-across.z, across.x); // xoay lòng bàn tay quanh trục dọc

    return {
      roll: this.filters.roll.filter(rawRoll * sensitivity, tMs),
      pitch: this.filters.pitch.filter(rawPitch * sensitivity, tMs),
      yaw: this.filters.yaw.filter(rawYaw * sensitivity, tMs)
    };
  }

  private classify(f: HandFeatures): ActiveGestureType {
    if (f.isThumbsUp || f.fourFingersCurled) {
      this.zoomEngaged = false;
      return f.isThumbsUp ? 'THUMBS_UP_UNZIP' : 'FIST_INERTIA_GRAB';
    }

    // 👌 Zoom: phải CHỤM đầu ngón cái + ngón trỏ trước thì mới vào chế độ zoom
    if (this.zoomEngaged) {
      const stillPinchPosture = f.indexExtended || f.span < PINCH_ENGAGE_SPAN * 1.5;
      if (stillPinchPosture && f.span < 1.8 && !(f.middleExtended && f.ringExtended && f.pinkyExtended && f.span > 1.2)) {
        return 'PINCH_ZOOM';
      }
      this.zoomEngaged = false;
    }
    if (f.span < PINCH_ENGAGE_SPAN) {
      this.zoomEngaged = true;
      this.zoomEngageSpan = f.span;
      this.zoomAtEngage = this.currentZoomNormalized;
      return 'PINCH_ZOOM';
    }

    if (f.indexExtended && f.middleExtended && !f.ringExtended && !f.pinkyExtended && f.span > 0.45) {
      return 'PEACE_TOP_VIEW';
    }
    if (f.indexExtended && !f.middleExtended && !f.ringExtended && !f.pinkyExtended && !f.thumbAwayFromPalm) {
      return 'POINT_INSPECT';
    }
    return 'PALM_3D_ORIENTATION';
  }

  private onGestureChange(_from: ActiveGestureType, to: ActiveGestureType, f: HandFeatures) {
    if (to === 'FIST_INERTIA_GRAB') {
      // Bắt đầu nắm tay: lấy vị trí hiện tại làm mốc, tránh "giật" do vị trí của cử chỉ trước
      this.prevWristPos = f.wrist;
    }
    if (to === 'PINCH_ZOOM' && !this.zoomEngaged) {
      this.zoomEngaged = true;
      this.zoomEngageSpan = f.span;
      this.zoomAtEngage = this.currentZoomNormalized;
    }
  }

  private buildOutput(
    gesture: ActiveGestureType,
    handsDetected: number,
    f: HandFeatures | null,
    angles: { pitch: number; yaw: number; roll: number },
    tMs = 0
  ): HandGestureComputeOutput {
    const toDeg = (r: number) => Math.round((r * 180) / Math.PI);
    const telemetry: HandTelemetryState = {
      handsDetected,
      primaryGesture: gesture,
      gestureConfidence: gesture === 'IDLE' ? 0 : 0.95,
      indexTipScreen: null,
      thumbTipScreen: null,
      pinchDistance: f ? Number(f.span.toFixed(2)) : 0,
      zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
      handRollDeg: toDeg(angles.roll),
      handPitchDeg: toDeg(angles.pitch),
      handYawDeg: toDeg(angles.yaw),
      inertiaSpeed: 0
    };
    const out: HandGestureComputeOutput = {
      telemetry,
      targetWristEuler: null,
      inertiaImpulse: null,
      targetZoomFactor: null,
      targetUnzipFactor: null,
      detectedCameraPreset: null
    };

    if (!f || gesture === 'IDLE') return out;

    // Theo dõi vị trí cổ tay cho quán tính (luôn cập nhật để không bị giật khi chuyển cử chỉ)
    const prev = this.prevWristPos;
    const dtSec = prev ? Math.max(1 / 120, (tMs - this.prevTimeMs) / 1000) : 0;
    this.prevWristPos = f.wrist;
    this.prevTimeMs = tMs;

    switch (gesture) {
      case 'THUMBS_UP_UNZIP':
        out.targetUnzipFactor = 0.9;
        break;

      case 'FIST_INERTIA_GRAB': {
        if (prev && dtSec > 0) {
          // Vận tốc theo giây → không phụ thuộc tốc độ khung hình (quy đổi về mức 30 khung/giây của bản cũ)
          const vx = (f.wrist.x - prev.x) / dtSec;
          const vy = (f.wrist.y - prev.y) / dtSec;
          out.inertiaImpulse = { x: (vy * 3.8) / 30, y: (vx * 4.4) / 30 };
          telemetry.inertiaSpeed = Math.min(100, Math.round(Math.hypot(vx, vy) * 60));
        } else {
          out.inertiaImpulse = { x: 0, y: 0 };
        }
        break;
      }

      case 'PEACE_TOP_VIEW':
        telemetry.handPitchDeg = 90;
        out.targetWristEuler = { x: Math.PI / 2, y: angles.yaw, z: 0 };
        out.targetUnzipFactor = 0;
        out.detectedCameraPreset = 'TOP_AXIS';
        break;

      case 'PINCH_ZOOM': {
        // Zoom tương đối kể từ lúc chụm: mở ngón ra → phóng to, khép lại → thu nhỏ
        const target = Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, this.zoomAtEngage + (f.span - this.zoomEngageSpan) * ZOOM_PER_SPAN)
        );
        this.currentZoomNormalized += (target - this.currentZoomNormalized) * 0.28;
        telemetry.zoomLevelNormalized = Number(this.currentZoomNormalized.toFixed(2));
        telemetry.indexTipScreen = { x: f.indexTip.x, y: f.indexTip.y };
        telemetry.thumbTipScreen = { x: f.thumbTip.x, y: f.thumbTip.y };
        out.targetZoomFactor = this.currentZoomNormalized;
        break;
      }

      case 'POINT_INSPECT':
        telemetry.indexTipScreen = { x: f.indexTip.x, y: f.indexTip.y };
        break;

      case 'PALM_3D_ORIENTATION':
        out.targetWristEuler = { x: angles.pitch, y: angles.yaw, z: angles.roll };
        out.targetUnzipFactor = 0;
        break;
    }

    return out;
  }
}

export const GESTURE_LABELS_VI: Record<
  ActiveGestureType,
  { icon: string; title: string; shortTitle: string; subtitle: string; badgeColor: string }
> = {
  IDLE: {
    shortTitle: 'Đang chờ',
    icon: '🖐️',
    title: 'Đang Chờ Cử Chỉ Bàn Tay / Điều Khiển Chuột',
    subtitle:
      'Đưa tay lên trước Camera: ✋ Xòe tay · ✌️ Chữ V · 👍 Ngón cái · 👌 Cái+Trỏ Zoom · ✊ Nắm tay · 👉 Chỉ trỏ',
    badgeColor: 'text-slate-300'
  },
  PALM_3D_ORIENTATION: {
    shortTitle: 'Xoè tay · xoay 3D',
    icon: '✋',
    title: '✋ Xòe Bàn Tay — Đồng Bộ Góc Nghiêng 3D (Roll · Pitch · Yaw)',
    subtitle:
      'Nghiêng cổ tay (Trục Z) · Úp/ngửa bàn tay (Trục X) · Xoay lòng bàn tay (Trục Y) như cầm mô hình thật',
    badgeColor: 'text-cyan-400'
  },
  PEACE_TOP_VIEW: {
    shortTitle: 'Chữ V · nhìn từ đỉnh',
    icon: '✌️',
    title: '✌️ Giơ 2 Ngón Chữ V — Góc Nhìn Từ Trên Đỉnh Xuống (Top-Down)',
    subtitle:
      'Nhìn rõ hình trụ tròn 20 Å của trục xoắn và vị trí các cặp base A=T, G≡C đối xứng qua tâm',
    badgeColor: 'text-sky-400'
  },
  THUMBS_UP_UNZIP: {
    shortTitle: 'Ngón cái · tách mạch',
    icon: '👍',
    title: '👍 Giơ Ngón Tay Cái — Tháo Xoắn & Tách Đôi Mạch / Tách Đơn Phân',
    subtitle:
      'Tách đôi 2 mạch đơn DNA (5\'→3\' & 3\'→5\') hoặc tách 3 thành phần cấu tạo của Nucleotide (phosphate - Đường - base)',
    badgeColor: 'text-orange-400'
  },
  PINCH_ZOOM: {
    shortTitle: 'Cái + trỏ · phóng to',
    icon: '👌',
    title: '👌 Ngón Cái + Ngón Trỏ — Mở Rộng Để Phóng To / Chụm Lại Để Thu Nhỏ',
    subtitle:
      'Chụm đầu ngón cái + ngón trỏ để bắt đầu, sau đó mở/khép để zoom (không phụ thuộc khoảng cách bàn tay tới camera)',
    badgeColor: 'text-amber-400'
  },
  FIST_INERTIA_GRAB: {
    shortTitle: 'Nắm tay · xoay quán tính',
    icon: '✊',
    title: '✊ Nắm Bàn Tay Lại (Fist / Grab) — Kéo Rê Xoay Theo Quán Tính',
    subtitle:
      'Kéo rê nắm tay để tạo đà xoay tự do mô hình 3D trong không gian theo quán tính vật lý',
    badgeColor: 'text-fuchsia-400'
  },
  POINT_INSPECT: {
    shortTitle: 'Ngón trỏ · tra cứu',
    icon: '👉',
    title: '👉 Chỉ 1 Ngón Trỏ (Point & Inspect) — Tra Cứu Thông Số Phân Tử',
    subtitle:
      'Rà đầu ngón trỏ vào nucleotide bất kỳ để xem tên (A, T, G, C, U), công thức hóa học & số liên kết hydrogen',
    badgeColor: 'text-emerald-400'
  }
};
