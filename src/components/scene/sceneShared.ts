import * as THREE from 'three';
import { BasePairStep, InspectableSubunit, NucleotideCode } from '../../types/molecular';

export interface DynamicMeshRecord {
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  explodeVector: THREE.Vector3;
  layerType: 'backbone' | 'nucleobase' | 'hydrogenBonds' | 'baseLabels3D' | 'sgkRuler3D';
  inspectable?: InspectableSubunit;
}

/** Thông tin mà mỗi hàm dựng cảnh nhận vào */
export interface SceneBuildContext {
  steps: BasePairStep[];
  selectedNucleotideBase: NucleotideCode;
  /** Vòng gimbal quanh đế mô hình (có thể null) */
  gimbal: THREE.Group | null;
  /** Thêm một vật thể vào cảnh, kèm hướng tách (👍) và lớp hiển thị */
  /** Thêm vật thể chỉ để tra cứu (👉) mà không tham gia hiệu ứng tách */
  addRaycastTarget: (object: THREE.Object3D) => void;
  addDynamic: (
    object: THREE.Object3D,
    basePosition: THREE.Vector3,
    explodeVector: THREE.Vector3,
    layerType: DynamicMeshRecord['layerType'],
    inspectable?: InspectableSubunit
  ) => void;
}


export function createTextBadgeSprite(
  text: string,
  bgColor: string,
  textColor = '#FFFFFF',
  borderColor = '#38BDF8',
  scaleWidth = 2.6,
  scaleHeight = 1.3
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const r = 26;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(10, 14, 300, 100, r);
  ctx.fill();

  ctx.lineWidth = 6;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  ctx.fillStyle = textColor;
  // Tự co cỡ chữ để nhãn dài không bị cắt mất ký tự
  let fontPx = 46;
  ctx.font = `700 ${fontPx}px "Be Vietnam Pro", sans-serif`;
  while (fontPx > 14 && ctx.measureText(text).width > 276) {
    fontPx -= 2;
    ctx.font = `700 ${fontPx}px "Be Vietnam Pro", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scaleWidth, scaleHeight, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function createBondCylinder(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  colorHex: number,
  metallic = 0.25
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 12);
  geo.translate(0, len / 2, 0);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: metallic
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(p1);
  mesh.lookAt(p2);
  return mesh;
}