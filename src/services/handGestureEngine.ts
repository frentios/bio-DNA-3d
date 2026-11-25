import { ActiveGestureType, HandTelemetryState } from '../types/molecular';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandGestureComputeOutput {
  telemetry: HandTelemetryState;
  /** ✋ Direct 1:1 3D wrist Euler orientation (Pitch X, Yaw Y, Roll Z in radians) */
  targetWristEuler: { x: number; y: number; z: number } | null;
  /** ✊ Rotational inertia impulse when dragging with a closed fist */
  inertiaImpulse: { x: number; y: number } | null;
  /** 👌 Target zoom factor controlled ONLY by Thumb-to-Index finger distance */
  targetZoomFactor: number | null;
  /** 👍 Target unzipping factor when showing Thumbs-Up */
  targetUnzipFactor: number | null;
  /** ✌️ Auto-switch to Top-Down Axis View when showing Peace sign */
  detectedCameraPreset: 'TOP_AXIS' | null;
}

export class HandGestureEngine {
  private prevWristPos: { x: number; y: number; z: number } | null = null;
  private smoothedWristEuler: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private currentZoomNormalized = 1.0;

  public processHands(
    multiHandLandmarks: NormalizedLandmark[][],
    wristSensitivity = 1.65
  ): HandGestureComputeOutput {
    const handsCount = multiHandLandmarks.length;

    if (handsCount === 0) {
      this.prevWristPos = null;
      return {
        telemetry: {
          handsDetected: 0,
          primaryGesture: 'IDLE',
          gestureConfidence: 0,
          indexTipScreen: null,
          thumbTipScreen: null,
          pinchDistance: 0,
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg: 0,
          handPitchDeg: 0,
          handYawDeg: 0,
          inertiaSpeed: 0
        },
        targetWristEuler: null,
        inertiaImpulse: null,
        targetZoomFactor: null,
        targetUnzipFactor: null,
        detectedCameraPreset: null
      };
    }

    const hand = multiHandLandmarks[0];
    // Mirror X coordinate so webcam movement matches screen left/right naturally
    const wrist = { x: 1 - hand[0].x, y: hand[0].y, z: hand[0].z };
    const thumbIp = { x: 1 - hand[3].x, y: hand[3].y, z: hand[3].z };
    const thumbTip = { x: 1 - hand[4].x, y: hand[4].y, z: hand[4].z };

    const indexMcp = { x: 1 - hand[5].x, y: hand[5].y, z: hand[5].z };
    const indexPip = { x: 1 - hand[6].x, y: hand[6].y, z: hand[6].z };
    const indexTip = { x: 1 - hand[8].x, y: hand[8].y, z: hand[8].z };

    const middleMcp = { x: 1 - hand[9].x, y: hand[9].y, z: hand[9].z };
    const middlePip = { x: 1 - hand[10].x, y: hand[10].y, z: hand[10].z };
    const middleTip = { x: 1 - hand[12].x, y: hand[12].y, z: hand[12].z };

    const ringPip = { x: 1 - hand[14].x, y: hand[14].y, z: hand[14].z };
    const ringTip = { x: 1 - hand[16].x, y: hand[16].y, z: hand[16].z };

    const pinkyMcp = { x: 1 - hand[17].x, y: hand[17].y, z: hand[17].z };
    const pinkyPip = { x: 1 - hand[18].x, y: hand[18].y, z: hand[18].z };
    const pinkyTip = { x: 1 - hand[20].x, y: hand[20].y, z: hand[20].z };

    // =========================================================================
    // ✋ PALM 3D ORIENTATION MATH (Roll Z, Pitch X, Yaw Y)
    // =========================================================================
    const dxUp = middleMcp.x - wrist.x;
    const dyUp = wrist.y - middleMcp.y;
    const dzUp = middleMcp.z - wrist.z;

    const dxAcross = pinkyMcp.x - indexMcp.x;
    const dzAcross = pinkyMcp.z - indexMcp.z;

    // Roll (Z-axis): Nghiêng cổ tay sang trái/phải
    const rawRollRad = -Math.atan2(dxUp, Math.max(0.06, dyUp)) * wristSensitivity;

    // Pitch (X-axis): Úp/ngửa bàn tay lên hoặc chúc xuống
    const rawPitchRad = (dzUp * 3.8 + (middleMcp.y - 0.5) * 1.95) * wristSensitivity;

    // Yaw (Y-axis): Xoay lòng bàn tay trái/phải 360°
    const palmTwistRad = Math.atan2(dzAcross, Math.abs(dxAcross) + 0.04) * 2.2;
    const wristAzimuthRad = (middleMcp.x - 0.5) * Math.PI * 1.9;
    const rawYawRad = (palmTwistRad + wristAzimuthRad) * wristSensitivity;

    const smoothAlpha = 0.34;
    this.smoothedWristEuler = {
      x: this.smoothedWristEuler.x + (rawPitchRad - this.smoothedWristEuler.x) * smoothAlpha,
      y: this.smoothedWristEuler.y + (rawYawRad - this.smoothedWristEuler.y) * smoothAlpha,
      z: this.smoothedWristEuler.z + (rawRollRad - this.smoothedWristEuler.z) * smoothAlpha
    };

    const handRollDeg = Math.round((this.smoothedWristEuler.z * 180) / Math.PI);
    const handPitchDeg = Math.round((this.smoothedWristEuler.x * 180) / Math.PI);
    const handYawDeg = Math.round((this.smoothedWristEuler.y * 180) / Math.PI);

    // =========================================================================
    // FINGER EXTENSION & SCALE-INVARIANT THUMB-INDEX SPAN
    // =========================================================================
    // Reference palm length so that Thumb-to-Index distance is 100% independent of hand-to-camera distance
    const palmReferenceScale = Math.max(0.075, this.dist2D(wrist, middleMcp));
    const rawThumbIndexDist = this.dist2D(thumbTip, indexTip);
    const thumbIndexSpanRatio = rawThumbIndexDist / palmReferenceScale;

    const indexExtended = this.dist2D(indexTip, wrist) > this.dist2D(indexPip, wrist) * 1.14;
    const middleExtended = this.dist2D(middleTip, wrist) > this.dist2D(middlePip, wrist) * 1.15;
    const ringExtended = this.dist2D(ringTip, wrist) > this.dist2D(ringPip, wrist) * 1.12;
    const pinkyExtended = this.dist2D(pinkyTip, wrist) > this.dist2D(pinkyPip, wrist) * 1.12;

    const fourFingersCurled = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;

    // Thumb extension check relative to index MCP and middle PIP
    const thumbToIndexMcpRatio = this.dist2D(thumbTip, indexMcp) / palmReferenceScale;
    const thumbToMiddlePipRatio = this.dist2D(thumbTip, middlePip) / palmReferenceScale;

    // 👍 Thumbs-Up Classifier:
    // 4 fingers curled in, while Thumb tip is pointing upward and extended away from index MCP
    const isThumbsUp =
      fourFingersCurled &&
      thumbTip.y < thumbIp.y - 0.015 &&
      thumbTip.y < indexPip.y &&
      thumbToIndexMcpRatio > 0.62;

    // -------------------------------------------------------------------------
    // GESTURE 3: 👍 THUMBS-UP -> Tháo xoắn / Tách đôi 2 mạch đơn (Unzipping DNA)
    // -------------------------------------------------------------------------
    if (isThumbsUp) {
      this.prevWristPos = wrist;
      return {
        telemetry: {
          handsDetected: handsCount,
          primaryGesture: 'THUMBS_UP_UNZIP',
          gestureConfidence: 0.95,
          indexTipScreen: null,
          thumbTipScreen: null,
          pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg,
          handPitchDeg,
          handYawDeg,
          inertiaSpeed: 0
        },
        targetWristEuler: null,
        inertiaImpulse: null,
        targetZoomFactor: null,
        targetUnzipFactor: 0.9,
        detectedCameraPreset: null
      };
    }

    // -------------------------------------------------------------------------
    // GESTURE 5: ✊ FIST / GRAB -> Kéo rê chuỗi DNA xoay tự do theo quán tính
    // -------------------------------------------------------------------------
    if (fourFingersCurled && !isThumbsUp) {
      let impulse = { x: 0, y: 0 };
      let speed = 0;
      if (this.prevWristPos) {
        const dx = wrist.x - this.prevWristPos.x;
        const dy = wrist.y - this.prevWristPos.y;
        impulse = {
          x: dy * 3.8,
          y: dx * 4.4
        };
        speed = Math.min(100, Math.round(Math.hypot(dx, dy) * 1800));
      }
      this.prevWristPos = wrist;

      return {
        telemetry: {
          handsDetected: handsCount,
          primaryGesture: 'FIST_INERTIA_GRAB',
          gestureConfidence: 0.94,
          indexTipScreen: null,
          thumbTipScreen: null,
          pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg,
          handPitchDeg,
          handYawDeg,
          inertiaSpeed: speed
        },
        targetWristEuler: null,
        inertiaImpulse: impulse,
        targetZoomFactor: null,
        targetUnzipFactor: null,
        detectedCameraPreset: null
      };
    }

    // -------------------------------------------------------------------------
    // GESTURE 2: ✌️ PEACE SIGN -> Nhìn từ trên đỉnh xuống (Top-down view)
    // -------------------------------------------------------------------------
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && thumbIndexSpanRatio > 0.45) {
      this.prevWristPos = wrist;
      return {
        telemetry: {
          handsDetected: handsCount,
          primaryGesture: 'PEACE_TOP_VIEW',
          gestureConfidence: 0.93,
          indexTipScreen: null,
          thumbTipScreen: null,
          pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg,
          handPitchDeg: 90,
          handYawDeg,
          inertiaSpeed: 0
        },
        targetWristEuler: { x: Math.PI / 2, y: this.smoothedWristEuler.y, z: 0 },
        inertiaImpulse: null,
        targetZoomFactor: null,
        targetUnzipFactor: 0,
        detectedCameraPreset: 'TOP_AXIS'
      };
    }

    // -------------------------------------------------------------------------
    // GESTURE 4: 👌 PINCH / SPREAD (Ngón Cái + Ngón Trỏ) -> Zoom Ra / Zoom Vào
    // Purely driven by the span between Thumb Tip (#4) and Index Tip (#8),
    // normalized by palm size so hand-to-camera distance has ZERO effect!
    // Triggered when:
    //  (A) Middle, Ring, Pinky are curled AND Thumb is extended out with Index (2-finger L/pinch caliper), OR
    //  (B) Thumb & Index tips are brought into 👌 pinch/caliper posture while other fingers are relaxed.
    // -------------------------------------------------------------------------
    const isTwoFingerZoomCaliper =
      !middleExtended &&
      !ringExtended &&
      !pinkyExtended &&
      indexExtended &&
      (thumbToMiddlePipRatio > 0.58 || thumbIndexSpanRatio < 0.65);

    const isOkSignZoomPosture =
      (middleExtended || ringExtended) && thumbIndexSpanRatio < 0.72;

    if (isTwoFingerZoomCaliper || isOkSignZoomPosture) {
      this.prevWristPos = wrist;

      // Map normalized Thumb-Index span [0.18 .. 1.35] strictly to Zoom [0.55x .. 2.45x]
      // Pinching Thumb + Index close together -> Zoom Out (0.55x)
      // Spreading Thumb + Index apart -> Zoom In (2.45x)
      const normalizedSpanClamped = Math.max(0.18, Math.min(1.35, thumbIndexSpanRatio));
      const targetZoom =
        0.55 + ((normalizedSpanClamped - 0.18) / (1.35 - 0.18)) * (2.45 - 0.55);

      this.currentZoomNormalized =
        this.currentZoomNormalized + (targetZoom - this.currentZoomNormalized) * 0.28;

      return {
        telemetry: {
          handsDetected: handsCount,
          primaryGesture: 'PINCH_ZOOM',
          gestureConfidence: 0.95,
          indexTipScreen: { x: indexTip.x, y: indexTip.y },
          thumbTipScreen: { x: thumbTip.x, y: thumbTip.y },
          pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg,
          handPitchDeg,
          handYawDeg,
          inertiaSpeed: 0
        },
        targetWristEuler: null,
        inertiaImpulse: null,
        targetZoomFactor: this.currentZoomNormalized,
        targetUnzipFactor: null,
        detectedCameraPreset: null
      };
    }

    // -------------------------------------------------------------------------
    // GESTURE 6: 👉 POINT & INSPECT -> Chỉ 1 ngón trỏ (Ngón cái khép vào lòng bàn tay)
    // -------------------------------------------------------------------------
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      this.prevWristPos = wrist;
      return {
        telemetry: {
          handsDetected: handsCount,
          primaryGesture: 'POINT_INSPECT',
          gestureConfidence: 0.94,
          indexTipScreen: { x: indexTip.x, y: indexTip.y },
          thumbTipScreen: null,
          pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
          zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
          handRollDeg,
          handPitchDeg,
          handYawDeg,
          inertiaSpeed: 0
        },
        targetWristEuler: null,
        inertiaImpulse: null,
        targetZoomFactor: null,
        targetUnzipFactor: null,
        detectedCameraPreset: null
      };
    }

    // -------------------------------------------------------------------------
    // GESTURE 1: ✋ XÒE BÀN TAY (PALM 3D ORIENTATION - Đồng bộ góc nghiêng 1:1)
    // Nghiêng cổ tay (Roll Z), Úp/ngửa bàn tay (Pitch X), Xoay lòng bàn tay 360° (Yaw Y)
    // -------------------------------------------------------------------------
    this.prevWristPos = wrist;

    return {
      telemetry: {
        handsDetected: handsCount,
        primaryGesture: 'PALM_3D_ORIENTATION',
        gestureConfidence: 0.96,
        indexTipScreen: null,
        thumbTipScreen: null,
        pinchDistance: Number(thumbIndexSpanRatio.toFixed(2)),
        zoomLevelNormalized: Number(this.currentZoomNormalized.toFixed(2)),
        handRollDeg,
        handPitchDeg,
        handYawDeg,
        inertiaSpeed: 0
      },
      targetWristEuler: { ...this.smoothedWristEuler },
      inertiaImpulse: null,
      targetZoomFactor: null,
      targetUnzipFactor: 0,
      detectedCameraPreset: null
    };
  }

  private dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

export const GESTURE_LABELS_VI: Record<
  ActiveGestureType,
  { icon: string; title: string; subtitle: string; badgeColor: string }
> = {
  IDLE: {
    icon: '🖐️',
    title: 'Đang Chờ Cử Chỉ Bàn Tay / Điều Khiển Chuột',
    subtitle:
      'Đưa tay lên trước Camera: ✋ Xòe tay · ✌️ Chữ V · 👍 Ngón cái · 👌 Cái+Trỏ Zoom · ✊ Nắm tay · 👉 Chỉ trỏ',
    badgeColor: 'text-slate-300'
  },
  PALM_3D_ORIENTATION: {
    icon: '✋',
    title: '✋ Xòe Bàn Tay — Đồng Bộ Góc Nghiêng 3D (Roll · Pitch · Yaw)',
    subtitle:
      'Nghiêng cổ tay (Trục Z) · Úp/ngửa bàn tay (Trục X) · Xoay lòng bàn tay 360° (Trục Y) như cầm mô hình thật',
    badgeColor: 'text-cyan-400'
  },
  PEACE_TOP_VIEW: {
    icon: '✌️',
    title: '✌️ Giơ 2 Ngón Chữ V — Góc Nhìn Từ Trên Đỉnh Xuống (Top-Down)',
    subtitle:
      'Nhìn rõ hình trụ tròn 20 Å của trục xoắn và vị trí các cặp base A=T, G≡C đối xứng qua tâm',
    badgeColor: 'text-sky-400'
  },
  THUMBS_UP_UNZIP: {
    icon: '👍',
    title: '👍 Giơ Ngón Tay Cái — Tháo Xoắn & Tách Đôi Mạch / Tách Đơn Phân',
    subtitle:
      'Tách đôi 2 mạch đơn DNA (5\'→3\' & 3\'→5\') hoặc tách 3 thành phần cấu tạo của Nucleotide (Photphat - Đường - Bazơ)',
    badgeColor: 'text-orange-400'
  },
  PINCH_ZOOM: {
    icon: '👌',
    title: '👌 Ngón Cái + Ngón Trỏ — Mở Rộng Để Phóng To / Chụm Lại Để Thu Nhỏ',
    subtitle:
      'Chỉ tính khoảng cách giữa đầu Ngón Cái và Ngón Trỏ (bỏ hoàn toàn phụ thuộc khoảng cách bàn tay tới camera)',
    badgeColor: 'text-amber-400'
  },
  FIST_INERTIA_GRAB: {
    icon: '✊',
    title: '✊ Nắm Bàn Tay Lại (Fist / Grab) — Kéo Rê Xoay Theo Quán Tính',
    subtitle:
      'Kéo rê nắm tay để tạo đà xoay tự do mô hình 3D trong không gian theo quán tính vật lý',
    badgeColor: 'text-fuchsia-400'
  },
  POINT_INSPECT: {
    icon: '👉',
    title: '👉 Chỉ 1 Ngón Trỏ (Point & Inspect) — Tra Cứu Thông Số Phân Tử',
    subtitle:
      'Rà đầu ngón trỏ vào nucleotide bất kỳ để xem tên (A, T, G, C, U), công thức hóa học & số liên kết Hydro',
    badgeColor: 'text-emerald-400'
  }
};
