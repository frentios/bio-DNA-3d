// Chuẩn bị tài nguyên MediaPipe để trang chạy được khi không có mạng:
//  - chép WASM từ node_modules vào public/mediapipe/wasm
//  - tải mô hình hand_landmarker.task vào public/mediapipe (chỉ tải 1 lần)
// Nếu không tải được mô hình (mất mạng), ứng dụng sẽ tự dùng bản trên CDN.
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'mediapipe');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const exists = async (p) => !!(await stat(p).catch(() => null));

await mkdir(join(outDir, 'wasm'), { recursive: true });
for (const f of [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm'
]) {
  await copyFile(join(wasmSrc, f), join(outDir, 'wasm', f));
}
console.log('[mediapipe] Đã chép WASM vào public/mediapipe/wasm');

const modelPath = join(outDir, 'hand_landmarker.task');
if (await exists(modelPath)) {
  console.log('[mediapipe] Mô hình đã có sẵn');
} else {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log('[mediapipe] Đã tải mô hình hand_landmarker.task');
  } catch (err) {
    console.warn(`[mediapipe] Không tải được mô hình (${err.message}); ứng dụng sẽ dùng CDN.`);
  }
}
