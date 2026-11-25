/**
 * Điều khiển mô hình bám theo bàn tay trong chế độ AR.
 *
 * Toạ độ dùng trong file này là toạ độ CHUẨN HOÁ TRÊN MÀN HÌNH của khung 3D:
 *  x, y ∈ [0, 1] (0,0 là góc trên-trái), kích thước tính theo tỉ lệ chiều cao khung.
 * Viewport chịu trách nhiệm đổi từ toạ độ camera sang toạ độ này (có tính phần bị cắt
 * do video hiển thị kiểu object-cover).
 */

export type ArFollowMode = 'FOLLOW' | 'GRAB';

export type ArFollowPhase =
  | 'REST' // mô hình ở giữa màn hình, chưa ai cầm
  | 'HELD' // đang cầm một tay
  | 'PLACED' // đã đặt xuống tại một vị trí
  | 'TWO_HAND' // hai tay cầm hai đầu
  | 'LOST'; // vừa mất dấu tay, đang chờ trước khi trôi về giữa

/** Một bàn tay, đã đổi sang toạ độ màn hình */
export interface ScreenHand {
  x: number;
  y: number;
  /** Chiều dài lòng bàn tay (cổ tay → gốc ngón giữa) theo tỉ lệ chiều cao khung */
  size: number;
  /** Tay đang nắm (4 ngón co lại) */
  closed: boolean;
}

export interface ArFollowTarget {
  phase: ArFollowPhase;
  /** Tâm mô hình trên màn hình */
  x: number;
  y: number;
  /** Chiều cao mô hình mong muốn, theo tỉ lệ chiều cao khung; null = giữ kích thước gốc */
  height: number | null;
  /** Góc quay quanh trục nhìn (radian) khi hai tay cầm hai đầu; null = không ép */
  alignRoll: number | null;
  /** Có nên xoay theo lòng bàn tay không */
  followPalmRotation: boolean;
  /** Vị trí các bàn tay đang "cầm" (để vẽ vòng sáng / tia nối) */
  holders: { x: number; y: number }[];
}

/** Mô hình lơ lửng cao hơn tâm lòng bàn tay một khoảng = hệ số × cỡ lòng bàn tay */
const FLOAT_ABOVE_PALM = 0.6;
/** Chiều cao mô hình khi cầm một tay = hệ số × cỡ lòng bàn tay */
const HEIGHT_PER_PALM = 2.6;
/** Bán kính "chạm" để nắm được mô hình (tỉ lệ chiều cao khung) */
const GRAB_RADIUS = 0.2;
/** Thời gian chờ trước khi mô hình trôi về giữa khi mất dấu tay */
const LOST_HOLD_MS = 500;

export class ArFollowController {
  private phase: ArFollowPhase = 'REST';
  private x = 0.5;
  private y = 0.5;
  private height: number | null = null;
  private lostAt = 0;

  reset() {
    this.phase = 'REST';
    this.x = 0.5;
    this.y = 0.5;
    this.height = null;
  }

  getPhase() {
    return this.phase;
  }

  update(hands: ScreenHand[], mode: ArFollowMode, tMs: number): ArFollowTarget {
    // Sắp xếp theo x để "tay trái màn hình" luôn là tay thứ nhất
    const hs = [...hands].sort((a, b) => a.x - b.x);

    // ---------- Giai đoạn 3: hai tay cầm hai đầu ----------
    //  - Luôn bám: cứ có hai tay là cầm hai đầu
    //  - Cầm – đặt: phải NẮM cả hai tay, và một tay đang cầm sẵn hoặc ở gần mô hình
    const twoHand =
      hs.length >= 2 &&
      (mode === 'FOLLOW' ||
        (hs[0].closed &&
          hs[1].closed &&
          (this.phase === 'HELD' || this.phase === 'TWO_HAND' || this.isNearModel(hs[0]) || this.isNearModel(hs[1]))));
    if (twoHand) {
      const [a, b] = hs;
      this.phase = 'TWO_HAND';
      this.x = (a.x + b.x) / 2;
      this.y = (a.y + b.y) / 2;
      this.height = Math.max(0.12, Math.hypot(b.x - a.x, b.y - a.y));
      // Trục dọc của mô hình (trục Y) nằm dọc đường nối hai tay.
      // Màn hình có trục y hướng xuống nên đổi dấu để ra góc trong không gian 3D.
      const angle = Math.atan2(-(b.y - a.y), b.x - a.x);
      return this.out(angle - Math.PI / 2, false, [a, b]);
    }

    if (this.phase === 'TWO_HAND') {
      // Vừa thôi cầm hai tay
      if (mode === 'GRAB') {
        // Còn đúng một tay đang nắm → cầm tiếp bằng tay đó; còn lại → đặt xuống tại chỗ
        this.phase = hs.length === 1 && hs[0].closed ? 'HELD' : 'PLACED';
      } else {
        this.phase = hs.length >= 1 ? 'HELD' : 'LOST';
        this.lostAt = tMs;
      }
    }

    const hand = hs[0];

    // ---------- Giai đoạn 1: luôn bám theo tay ----------
    if (mode === 'FOLLOW') {
      if (hand) {
        this.phase = 'HELD';
        this.holdAbove(hand);
        return this.out(null, true, [hand]);
      }
      return this.handleLost(tMs);
    }

    // ---------- Giai đoạn 2: cầm lên – đặt xuống ----------
    if (this.phase === 'HELD') {
      if (!hand) {
        // Mất dấu khi đang cầm: coi như đặt xuống tại chỗ
        this.phase = 'PLACED';
        return this.out(null, false, []);
      }
      if (!hand.closed) {
        // ✋ Xoè tay ra → đặt mô hình xuống tại vị trí hiện tại
        this.phase = 'PLACED';
        return this.out(null, false, []);
      }
      this.holdAbove(hand);
      return this.out(null, true, [hand]);
    }

    // Đang nghỉ / đã đặt / mất dấu: ✊ nắm tay ở gần mô hình thì nhấc lên
    if (hand && hand.closed && this.isNearModel(hand)) {
      this.phase = 'HELD';
      this.holdAbove(hand);
      return this.out(null, true, [hand]);
    }
    if (this.phase === 'LOST') return this.handleLost(tMs);
    return this.out(null, false, []);
  }

  private holdAbove(hand: ScreenHand) {
    this.height = hand.size * HEIGHT_PER_PALM;
    this.x = hand.x;
    this.y = hand.y - hand.size * FLOAT_ABOVE_PALM - this.height / 2;
  }

  private isNearModel(hand: ScreenHand) {
    const h = this.height ?? 0.6;
    // Cho phép nắm ở bất kỳ điểm nào trong khoảng chiều cao mô hình
    return Math.abs(hand.x - this.x) < Math.max(GRAB_RADIUS, h * 0.35) && Math.abs(hand.y - this.y) < Math.max(GRAB_RADIUS, h * 0.6);
  }

  private handleLost(tMs: number): ArFollowTarget {
    if (this.phase === 'HELD' || this.phase === 'TWO_HAND') {
      this.phase = 'LOST';
      this.lostAt = tMs;
    }
    if (this.phase === 'LOST' && tMs - this.lostAt > LOST_HOLD_MS) {
      this.reset();
    }
    return this.out(null, false, []);
  }

  private out(alignRoll: number | null, followPalmRotation: boolean, holders: ScreenHand[]): ArFollowTarget {
    // Giữ mô hình trong khung hình (khi một tay: không để mô hình trôi khỏi mép trên/dưới)
    if (this.height !== null && alignRoll === null) {
      const half = Math.min(0.48, this.height / 2);
      this.y = Math.min(1 - half, Math.max(half, this.y));
      this.x = Math.min(0.97, Math.max(0.03, this.x));
    }
    return {
      phase: this.phase,
      x: this.x,
      y: this.y,
      height: this.height,
      alignRoll,
      followPalmRotation,
      holders: holders.map((h) => ({ x: h.x, y: h.y }))
    };
  }
}

/**
 * Đổi toạ độ chuẩn hoá của camera (đã lật gương) sang toạ độ chuẩn hoá trên khung 3D,
 * khi video được hiển thị kiểu object-cover (phóng cho kín khung rồi cắt phần thừa).
 */
export function videoToScreen(
  p: { x: number; y: number },
  video: { w: number; h: number },
  box: { w: number; h: number }
) {
  const s = Math.max(box.w / video.w, box.h / video.h);
  const dw = video.w * s;
  const dh = video.h * s;
  const ox = (box.w - dw) / 2;
  const oy = (box.h - dh) / 2;
  return { x: (ox + p.x * dw) / box.w, y: (oy + p.y * dh) / box.h, scaleY: dh / box.h };
}
