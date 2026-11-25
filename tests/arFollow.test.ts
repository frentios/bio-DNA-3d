import { ArFollowController, videoToScreen, ScreenHand } from '../src/services/arFollow';

let ok = 0, fail = 0;
const check = (name: string, c: boolean, info: unknown = '') => {
  c ? ok++ : fail++;
  console.log((c ? 'PASS ' : 'FAIL ') + name, info);
};
const H = (x: number, y: number, closed = false, size = 0.15): ScreenHand => ({ x, y, closed, size });
let t = 0;
const step = (c: ArFollowController, hands: ScreenHand[], mode: 'FOLLOW' | 'GRAB', n = 1) => {
  let o = c.update(hands, mode, (t += 33));
  for (let i = 1; i < n; i++) o = c.update(hands, mode, (t += 33));
  return o;
};

// --- Giai đoạn 1: luôn bám ---
{
  const c = new ArFollowController();
  const o = step(c, [H(0.3, 0.7)], 'FOLLOW');
  check('bám: mô hình theo tay (x)', Math.abs(o.x - 0.3) < 1e-6, o.x);
  check('bám: mô hình nằm phía trên lòng bàn tay', o.y < 0.7, o.y);
  check('bám: to nhỏ theo cỡ bàn tay', step(c, [H(0.3, 0.7, false, 0.3)], 'FOLLOW').height! > o.height!);
  check('bám: xoay theo lòng bàn tay', o.followPalmRotation === true);
  const lost = step(c, [], 'FOLLOW');
  check('mất tay: giữ nguyên chỗ cũ', lost.phase === 'LOST' && Math.abs(lost.x - 0.3) < 1e-6, lost.phase);
  const back = step(c, [], 'FOLLOW', 20);
  check('mất tay > 0,5 s: về giữa màn hình', back.phase === 'REST' && back.x === 0.5 && back.height === null, back);
}

{
  const c = new ArFollowController();
  const o = step(c, [H(0.5, 0.4, false, 0.25)], 'FOLLOW');
  check('bám: mô hình không vượt mép trên khung', o.y - o.height! / 2 >= -1e-9, { top: o.y - o.height! / 2 });
}

// --- Giai đoạn 2: cầm – đặt ---
{
  const c = new ArFollowController();
  check('xoè tay xa mô hình: không nhấc', step(c, [H(0.1, 0.9)], 'GRAB').phase === 'REST');
  check('nắm tay xa mô hình: không nhấc', step(c, [H(0.05, 0.95, true)], 'GRAB').phase === 'REST');
  const grab = step(c, [H(0.5, 0.55, true)], 'GRAB');
  check('nắm tay gần mô hình: nhấc lên', grab.phase === 'HELD', grab.phase);
  const move = step(c, [H(0.75, 0.8, true)], 'GRAB');
  check('đang cầm: mô hình đi theo nắm tay', move.phase === 'HELD' && Math.abs(move.x - 0.75) < 1e-6);
  const place = step(c, [H(0.75, 0.8, false)], 'GRAB');
  check('xoè tay: đặt xuống tại chỗ', place.phase === 'PLACED' && Math.abs(place.x - 0.75) < 1e-6, place);
  const after = step(c, [H(0.2, 0.3, false)], 'GRAB', 5);
  check('đã đặt: tay đi chỗ khác, mô hình đứng yên', after.phase === 'PLACED' && Math.abs(after.x - 0.75) < 1e-6);
  const regrab = step(c, [H(0.75, after.y + 0.05, true)], 'GRAB');
  check('nắm lại chỗ mô hình: nhấc lên lần nữa', regrab.phase === 'HELD', regrab.phase);
  const drop = step(c, [], 'GRAB');
  check('mất tay khi đang cầm: đặt tại chỗ (không biến mất)', drop.phase === 'PLACED');
}

// --- Giai đoạn 3: hai tay ---
{
  const c = new ArFollowController();
  const o = step(c, [H(0.7, 0.5), H(0.3, 0.5)], 'FOLLOW');
  check('hai tay: tâm ở giữa hai tay', o.phase === 'TWO_HAND' && Math.abs(o.x - 0.5) < 1e-6, o);
  check('hai tay: dài bằng khoảng cách hai tay', Math.abs(o.height! - 0.4) < 1e-6, o.height);
  check('hai tay ngang: mô hình nằm ngang (−90°)', Math.abs(o.alignRoll! + Math.PI / 2) < 1e-6, o.alignRoll);
  const wide = step(c, [H(0.1, 0.5), H(0.9, 0.5)], 'FOLLOW');
  check('kéo hai tay ra: mô hình dài ra', wide.height! > o.height!);
  const tilt = step(c, [H(0.3, 0.7), H(0.7, 0.3)], 'FOLLOW');
  check('hai tay chéo: mô hình nghiêng theo', Math.abs(tilt.alignRoll! - (Math.PI / 4 - Math.PI / 2)) < 1e-6, tilt.alignRoll);
  check('bỏ một tay: chuyển về cầm một tay', step(c, [H(0.3, 0.7)], 'FOLLOW').phase === 'HELD');

  const g = new ArFollowController();
  check('cầm–đặt: hai tay xoè không cầm', step(g, [H(0.3, 0.5), H(0.7, 0.5)], 'GRAB').phase === 'REST');
  check('cầm–đặt: hai tay nắm gần mô hình thì cầm hai đầu', step(g, [H(0.4, 0.5, true), H(0.6, 0.5, true)], 'GRAB').phase === 'TWO_HAND');
  const rel = step(g, [H(0.4, 0.5), H(0.6, 0.5)], 'GRAB');
  check('cầm–đặt: xoè cả hai tay thì đặt xuống', rel.phase === 'PLACED', rel.phase);
  step(g, [H(0.4, 0.5, true), H(0.6, 0.5, true)], 'GRAB');
  const one = step(g, [H(0.4, 0.5, true)], 'GRAB');
  check('cầm–đặt: bỏ một tay, tay kia vẫn nắm thì cầm tiếp', one.phase === 'HELD', one.phase);
}

// --- Đổi toạ độ camera → khung (object-cover) ---
{
  const wide = videoToScreen({ x: 0.5, y: 0.5 }, { w: 640, h: 480 }, { w: 1600, h: 600 });
  check('tâm camera = tâm khung', Math.abs(wide.x - 0.5) < 1e-9 && Math.abs(wide.y - 0.5) < 1e-9);
  const top = videoToScreen({ x: 0.5, y: 0 }, { w: 640, h: 480 }, { w: 1600, h: 600 });
  check('khung rộng: phần trên video bị cắt (y < 0)', top.y < 0, top.y);
  const tall = videoToScreen({ x: 0, y: 0.5 }, { w: 640, h: 480 }, { w: 400, h: 800 });
  check('khung cao: phần trái video bị cắt (x < 0)', tall.x < 0, tall.x);
}

console.log(`\n${ok} đạt, ${fail} lỗi`);
process.exitCode = fail > 0 ? 1 : 0;
