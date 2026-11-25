import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  BasePairStep,
  MolecularLayerVisibility,
  HandCameraOrientation,
  HoveredSubunitInfo,
  InspectableSubunit,
  ModelTabId,
  NucleotideCode
} from '../types/molecular';
import { BASE_VISUAL_CONFIG } from '../services/pdbService';

interface MolecularViewport3DProps {
  activeTab: ModelTabId;
  selectedNucleotideBase: NucleotideCode;
  steps: BasePairStep[];
  layerVisibility: MolecularLayerVisibility;
  explosionFactor: number;
  cameraOrientation: HandCameraOrientation;
  arPassthrough: boolean;
  videoStream: MediaStream | null;
  /** ✋ Direct 1:1 3D wrist Euler orientation (Pitch X, Yaw Y, Roll Z in radians) */
  targetWristEuler: { x: number; y: number; z: number } | null;
  /** ✊ Rotational inertia impulse when dragging with a closed fist */
  inertiaImpulse: { x: number; y: number } | null;
  /** 👌 Target zoom factor controlled ONLY by Thumb + Index distance */
  handZoomFactor: number | null;
  /** 👉 Point & Inspect screen coordinates */
  pointerScreenCoords: { x: number; y: number } | null;
  focusedStepIndex: number | null;
  autoRotate: boolean;
  onSubunitHover: (info: HoveredSubunitInfo | null) => void;
  onSubunitSelect: (subunit: InspectableSubunit) => void;
  onManualRotationChange?: (deg: { pitch: number; yaw: number; roll: number }) => void;
}

interface DynamicMeshRecord {
  object: THREE.Object3D;
  basePosition: THREE.Vector3;
  explodeVector: THREE.Vector3;
  layerType: 'backbone' | 'nucleobase' | 'hydrogenBonds' | 'baseLabels3D' | 'sgkRuler3D';
  inspectable?: InspectableSubunit;
}

function createTextBadgeSprite(
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

function createBondCylinder(
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

export const MolecularViewport3D: React.FC<MolecularViewport3DProps> = ({
  activeTab,
  selectedNucleotideBase,
  steps,
  layerVisibility,
  explosionFactor,
  cameraOrientation,
  arPassthrough,
  videoStream,
  targetWristEuler,
  inertiaImpulse,
  handZoomFactor,
  pointerScreenCoords,
  focusedStepIndex,
  autoRotate,
  onSubunitHover,
  onSubunitSelect,
  onManualRotationChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const arVideoRef = useRef<HTMLVideoElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dnaGroupRef = useRef<THREE.Group | null>(null);
  const wristGimbalRingRef = useRef<THREE.Group | null>(null);
  const dynamicRecordsRef = useRef<DynamicMeshRecord[]>([]);
  const raycastTargetsRef = useRef<THREE.Object3D[]>([]);
  const highlightRingRef = useRef<THREE.Mesh | null>(null);

  const angularVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const latestPropsRef = useRef({
    activeTab,
    selectedNucleotideBase,
    steps,
    layerVisibility,
    explosionFactor,
    cameraOrientation,
    targetWristEuler,
    inertiaImpulse,
    handZoomFactor,
    pointerScreenCoords,
    focusedStepIndex,
    autoRotate
  });

  useEffect(() => {
    latestPropsRef.current = {
      activeTab,
      selectedNucleotideBase,
      steps,
      layerVisibility,
      explosionFactor,
      cameraOrientation,
      targetWristEuler,
      inertiaImpulse,
      handZoomFactor,
      pointerScreenCoords,
      focusedStepIndex,
      autoRotate
    };
  });

  useEffect(() => {
    if (
      inertiaImpulse &&
      (Math.abs(inertiaImpulse.x) > 0.0005 || Math.abs(inertiaImpulse.y) > 0.0005)
    ) {
      angularVelocityRef.current = {
        x: THREE.MathUtils.clamp(inertiaImpulse.x * 0.45, -0.14, 0.14),
        y: THREE.MathUtils.clamp(inertiaImpulse.y * 0.45, -0.18, 0.18)
      };
    }
  }, [inertiaImpulse]);

  useEffect(() => {
    if (arVideoRef.current && videoStream && arPassthrough) {
      arVideoRef.current.srcObject = videoStream;
      arVideoRef.current.play().catch(() => {});
    }
  }, [videoStream, arPassthrough]);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      600
    );
    camera.position.set(0, 0, 56);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(30, 40, 45);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    fillLight.position.set(-35, -20, 25);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.6);
    rimLight.position.set(0, 30, -40);
    scene.add(rimLight);

    const dnaGroup = new THREE.Group();
    scene.add(dnaGroup);
    dnaGroupRef.current = dnaGroup;

    // 3D Tactile Wrist Gimbal Ring around the base
    const gimbalGroup = new THREE.Group();
    const gimbalTorus1 = new THREE.Mesh(
      new THREE.TorusGeometry(13.5, 0.08, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.32 })
    );
    gimbalTorus1.rotation.x = Math.PI / 2;
    gimbalGroup.add(gimbalTorus1);

    const gimbalTorus2 = new THREE.Mesh(
      new THREE.TorusGeometry(14.2, 0.06, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.2 })
    );
    gimbalGroup.add(gimbalTorus2);
    dnaGroup.add(gimbalGroup);
    wristGimbalRingRef.current = gimbalGroup;

    // Hover Highlight Halo Ring
    const ringGeo = new THREE.TorusGeometry(1.45, 0.14, 16, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.95 });
    const highlightRing = new THREE.Mesh(ringGeo, ringMat);
    highlightRing.visible = false;
    dnaGroup.add(highlightRing);
    highlightRingRef.current = highlightRing;

    let wheelZoomMul = 1;
    let lastHoverKey = '';
    let isDragging = false;
    let isRightDrag = false;
    let prevMouse = { x: 0, y: 0 };
    const mouseNDC = new THREE.Vector2(-999, -999);
    const raycaster = new THREE.Raycaster();

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true;
      isRightDrag = e.button === 2 || e.shiftKey;
      prevMouse = { x: e.clientX, y: e.clientY };
      angularVelocityRef.current = { x: 0, y: 0 };
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging && dnaGroupRef.current) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        if (isRightDrag) {
          dnaGroupRef.current.position.x += dx * 0.05;
          dnaGroupRef.current.position.y -= dy * 0.05;
        } else {
          const rotVy = dx * 0.009;
          const rotVx = dy * 0.009;
          dnaGroupRef.current.rotation.y += rotVy;
          dnaGroupRef.current.rotation.x = THREE.MathUtils.clamp(
            dnaGroupRef.current.rotation.x + rotVx,
            -Math.PI * 0.85,
            Math.PI * 0.85
          );
          angularVelocityRef.current = { x: rotVx * 0.65, y: rotVy * 0.65 };

          if (onManualRotationChange) {
            onManualRotationChange({
              pitch: Math.round((dnaGroupRef.current.rotation.x * 180) / Math.PI),
              yaw: Math.round((dnaGroupRef.current.rotation.y * 180) / Math.PI),
              roll: Math.round((dnaGroupRef.current.rotation.z * 180) / Math.PI)
            });
          }
        }
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleClick = () => {
      if (!dnaGroupRef.current || !cameraRef.current) return;
      raycaster.setFromCamera(mouseNDC, cameraRef.current);
      const visibleTargets = raycastTargetsRef.current.filter((t) => t.visible);
      const hits = raycaster.intersectObjects(visibleTargets, false);
      if (hits.length > 0) {
        const subunit = hits[0].object.userData.inspectable as InspectableSubunit | undefined;
        if (subunit) {
          onSubunitSelect(subunit);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      wheelZoomMul = THREE.MathUtils.clamp(wheelZoomMul * (1 + e.deltaY * 0.0012), 0.3, 2);
      cameraRef.current.position.z = Math.max(
        14,
        Math.min(110, cameraRef.current.position.z + e.deltaY * 0.035)
      );
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domElem.addEventListener('click', handleClick);
    domElem.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const targetEulerObj = new THREE.Euler(0, 0, 0, 'YXZ');
    const targetQuatObj = new THREE.Quaternion();

    let animId = 0;
    let lastRaycastMs = 0;

    const animate = (nowMs: number) => {
      animId = requestAnimationFrame(animate);
      const state = latestPropsRef.current;
      const group = dnaGroupRef.current;
      const cam = cameraRef.current;

      if (group && cam) {
        // 1. ✊ Rotational Inertia (Quán tính xoay tự do khi nắm tay kéo rê)
        const vel = angularVelocityRef.current;
        if (!isDragging && (Math.abs(vel.x) > 0.0002 || Math.abs(vel.y) > 0.0002)) {
          group.rotation.x = THREE.MathUtils.clamp(
            group.rotation.x + vel.x,
            -Math.PI * 0.88,
            Math.PI * 0.88
          );
          group.rotation.y += vel.y;
          vel.x *= 0.965;
          vel.y *= 0.965;
        } else if (state.targetWristEuler !== null && !isDragging) {
          // 2. ✋ Direct 1:1 Palm 3D Orientation (Roll Z, Pitch X, Yaw Y)
          targetEulerObj.set(
            state.targetWristEuler.x,
            state.targetWristEuler.y,
            state.targetWristEuler.z,
            'YXZ'
          );
          targetQuatObj.setFromEuler(targetEulerObj);
          group.quaternion.slerp(targetQuatObj, 0.28);
        } else if (state.autoRotate && !isDragging) {
          group.rotation.y += 0.004;
        }

        // 3. 👌 Thumb + Index Span Zoom (Thu phóng độc lập khoảng cách bàn tay)
        const defaultZ =
          state.activeTab === 'NUCLEOTIDE_STRUCTURE'
            ? 42
            : state.activeTab === 'DNA_VS_MRNA'
            ? 66
            : 56;

        if (state.focusedStepIndex !== null) {
          cam.position.z = THREE.MathUtils.lerp(cam.position.z, 24, 0.08);
        } else if (state.handZoomFactor !== null) {
          const targetZ = (defaultZ / state.handZoomFactor) * wheelZoomMul;
          cam.position.z = THREE.MathUtils.lerp(
            cam.position.z,
            THREE.MathUtils.clamp(targetZ, 15, 105),
            0.14
          );
        }

        // 4. 👍 Thumbs-Up Unzipping DNA / Separating Nucleotide Subunits
        const exp = state.explosionFactor;
        const records = dynamicRecordsRef.current;

        for (let i = 0; i < records.length; i++) {
          const rec = records[i];
          let visible = true;
          if (rec.layerType === 'backbone') visible = state.layerVisibility.backbone;
          else if (rec.layerType === 'nucleobase') visible = state.layerVisibility.nucleobase;
          else if (rec.layerType === 'hydrogenBonds') {
            visible = state.layerVisibility.hydrogenBonds && exp < 0.28;
          } else if (rec.layerType === 'baseLabels3D') {
            visible = state.layerVisibility.baseLabels3D && state.layerVisibility.nucleobase;
          } else if (rec.layerType === 'sgkRuler3D') {
            visible = state.layerVisibility.sgkRuler3D;
          }

          rec.object.visible = visible;

          const tx = rec.basePosition.x + rec.explodeVector.x * exp;
          const ty = rec.basePosition.y + rec.explodeVector.y * exp;
          const tz = rec.basePosition.z + rec.explodeVector.z * exp;

          rec.object.position.x = THREE.MathUtils.lerp(rec.object.position.x, tx, 0.14);
          rec.object.position.y = THREE.MathUtils.lerp(rec.object.position.y, ty, 0.14);
          rec.object.position.z = THREE.MathUtils.lerp(rec.object.position.z, tz, 0.14);
        }

        // 5. 👉 Point & Inspect Raycasting
        if (nowMs - lastRaycastMs > 50) {
          lastRaycastMs = nowMs;
          const activeNDC = state.pointerScreenCoords
            ? new THREE.Vector2(
                state.pointerScreenCoords.x * 2 - 1,
                -(state.pointerScreenCoords.y * 2 - 1)
              )
            : mouseNDC;

          if (activeNDC.x >= -1 && activeNDC.x <= 1 && activeNDC.y >= -1 && activeNDC.y <= 1) {
            raycaster.setFromCamera(activeNDC, cam);
            const candidates = raycastTargetsRef.current.filter((obj) => obj.visible);
            const hits = raycaster.intersectObjects(candidates, false);

            if (hits.length > 0) {
              const hitObj = hits[0].object;
              const subunit = hitObj.userData.inspectable as InspectableSubunit | undefined;

              if (subunit) {
                if (highlightRingRef.current) {
                  highlightRingRef.current.visible = true;
                  const worldPos = new THREE.Vector3();
                  hitObj.getWorldPosition(worldPos);
                  group.worldToLocal(worldPos);
                  highlightRingRef.current.position.copy(worldPos);
                  highlightRingRef.current.lookAt(cam.position);
                }

                const screenPos = new THREE.Vector3();
                hitObj.getWorldPosition(screenPos);
                screenPos.project(cam);

                const screenX = ((screenPos.x + 1) * container.clientWidth) / 2;
                const screenY = ((-screenPos.y + 1) * container.clientHeight) / 2;

                const hoverKey = `${subunit.id}|${Math.round(screenX / 4)}|${Math.round(screenY / 4)}`;
                if (hoverKey !== lastHoverKey) {
                  lastHoverKey = hoverKey;
                  onSubunitHover({ subunit, screenX, screenY });
                }
              }
            } else {
              if (highlightRingRef.current) highlightRingRef.current.visible = false;
              if (lastHoverKey !== '') {
                lastHoverKey = '';
                onSubunitHover(null);
              }
            }
          }
        }
      }

      if (cam) renderer.render(scene, cam);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domElem.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domElem.removeEventListener('click', handleClick);
      domElem.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      if (domElem.parentNode) domElem.parentNode.removeChild(domElem);
    };
  }, []);

  // Rebuild 3D Geometry whenever activeTab, selectedNucleotideBase, or steps change
  useEffect(() => {
    const group = dnaGroupRef.current;
    if (!group) return;

    dynamicRecordsRef.current.forEach((rec) => {
      group.remove(rec.object);
    });
    dynamicRecordsRef.current = [];
    raycastTargetsRef.current = [];

    const addDynamic = (
      object: THREE.Object3D,
      basePosition: THREE.Vector3,
      explodeVector: THREE.Vector3,
      layerType: DynamicMeshRecord['layerType'],
      inspectable?: InspectableSubunit
    ) => {
      object.position.copy(basePosition);
      if (inspectable) {
        object.userData = { inspectable };
        raycastTargetsRef.current.push(object);
      }
      group.add(object);
      dynamicRecordsRef.current.push({
        object,
        basePosition: basePosition.clone(),
        explodeVector: explodeVector.clone(),
        layerType,
        inspectable
      });
    };

    // =========================================================================
    // TAB 3: CẤU TRÚC ĐƠN PHÂN NUCLEOTIDE 3D (NUCLEOTIDE_STRUCTURE)
    // =========================================================================
    if (activeTab === 'NUCLEOTIDE_STRUCTURE') {
      if (wristGimbalRingRef.current) {
        wristGimbalRingRef.current.position.set(0, -13, 0);
      }

      const baseCfg = BASE_VISUAL_CONFIG[selectedNucleotideBase];
      const isRNA = selectedNucleotideBase === 'U';
      const isPurine = selectedNucleotideBase === 'A' || selectedNucleotideBase === 'G';

      const expPhosphate = new THREE.Vector3(-9.5, 2.5, 0);
      const expSugar = new THREE.Vector3(0, 0, 0);
      const expBase = new THREE.Vector3(9.5, 1.5, 0);

      // Title Plaque for Single Nucleotide Anatomy
      const headerBadge = createTextBadgeSprite(
        `ĐƠN PHÂN NUCLEOTIDE: ${baseCfg.vietnameseName.toUpperCase()}`,
        '#0F172A',
        baseCfg.colorHex,
        baseCfg.colorHex,
        13.5,
        1.9
      );
      addDynamic(headerBadge, new THREE.Vector3(0, 12.2, 0), new THREE.Vector3(0, 0, 0), 'sgkRuler3D');

      // -----------------------------------------------------------------------
      // SUBUNIT 1: NHÓM PHOSPHATE (-PO₄³⁻) at Left (-10, 4.5, 0)
      // -----------------------------------------------------------------------
      const pCenter = new THREE.Vector3(-10.2, 4.2, 0);
      const inspectPhosphate: InspectableSubunit = {
        id: 'nuc-phosphate-group',
        stepIndex: 1,
        partType: 'PHOSPHATE_GROUP',
        baseCode: selectedNucleotideBase,
        partnerBaseCode: baseCfg.partnerCode,
        strandLabel: 'Cấu tạo đơn phân Nucleotide',
        titleVi: '① Nhóm phosphate (-PO₄³⁻ / phosphoric acid H₃PO₄)',
        chemicalFormula: '-PO₄³⁻ (Gồm 1 nguyên tử P liên kết với 4 nguyên tử O)',
        chemicalGroupVi: 'Thành phần tạo tính acid & mang điện tích âm của chuỗi DNA/RNA',
        ntbsRuleVi:
          'Nhóm phosphate gắn vào nguyên tử Carbon C5\' của đường pentose qua liên kết phosphodiester, và nối với C3\'-OH của nucleotide kế tiếp tạo thành liên kết cộng hóa trị phosphodiester bền vững.',
        hydrogenBondCount: 0,
        cycleNumber: 1,
        heightAngstrom: 4.2
      };

      // Central Phosphorus Atom (Orange Sphere)
      const pAtom = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 28, 28),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.2, metalness: 0.3 })
      );
      addDynamic(pAtom, pCenter, expPhosphate, 'backbone', inspectPhosphate);

      const pLabel = createTextBadgeSprite('P (phosphorus)', '#7C2D12', '#FDBA74', '#F97316', 4.2, 1.3);
      addDynamic(
        pLabel,
        pCenter.clone().add(new THREE.Vector3(0, 2.3, 0)),
        expPhosphate,
        'baseLabels3D'
      );

      // 4 Tetrahedral Oxygen Atoms around Phosphorus
      const oxygenOffsets = [
        { vec: new THREE.Vector3(0, 3.2, 1.2), label: '=O' },
        { vec: new THREE.Vector3(-3.1, 0.5, 1.1), label: 'O⁻' },
        { vec: new THREE.Vector3(-1.4, -2.9, -1.5), label: 'O⁻' },
        { vec: new THREE.Vector3(3.1, -1.2, 0), label: "O (Cầu nối C5')" }
      ];

      oxygenOffsets.forEach((ox) => {
        const oPos = pCenter.clone().add(ox.vec);
        const oMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.05, 24, 24),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.2 })
        );
        addDynamic(oMesh, oPos, expPhosphate, 'backbone', inspectPhosphate);

        const bondP_O = createBondCylinder(pCenter, oPos, 0.28, 0xfdba74);
        addDynamic(bondP_O, pCenter, expPhosphate, 'backbone', inspectPhosphate);

        const oBadge = createTextBadgeSprite(ox.label, '#450A0A', '#FCA5A5', '#EF4444', 3.4, 1.1);
        addDynamic(
          oBadge,
          oPos.clone().add(new THREE.Vector3(0, -1.5, 0)),
          expPhosphate,
          'baseLabels3D'
        );
      });

      const subBanner1 = createTextBadgeSprite(
        '① NHÓM PHOSPHATE (-PO₄³⁻)',
        '#431407',
        '#FDBA74',
        '#F97316',
        7.5,
        1.5
      );
      addDynamic(subBanner1, new THREE.Vector3(-10.2, 9.2, 0), expPhosphate, 'sgkRuler3D');

      // -----------------------------------------------------------------------
      // SUBUNIT 2: ĐƯỜNG PENTOZƠ 5 CARBON (Deoxyribose C₅H₁₀O₄ or Ribose C₅H₁₀O₅)
      // -----------------------------------------------------------------------
      const inspectSugar: InspectableSubunit = {
        id: 'nuc-pentose-sugar',
        stepIndex: 1,
        partType: isRNA ? 'RIBOSE_SUGAR' : 'DEOXYRIBOSE_SUGAR',
        baseCode: selectedNucleotideBase,
        partnerBaseCode: baseCfg.partnerCode,
        strandLabel: 'Cấu tạo đơn phân Nucleotide',
        titleVi: isRNA
          ? '② Đường Ribose 5 Carbon (C₅H₁₀O₅ — Đơn phân mRNA)'
          : '② Đường Deoxyribose 5 Carbon (C₅H₁₀O₄ — Đơn phân DNA)',
        chemicalFormula: isRNA ? 'C₅H₁₀O₅ (Có nhóm -OH ở C2\')' : 'C₅H₁₀O₄ (Thiếu 1 nguyên tử oxygen ở C2\')',
        chemicalGroupVi: 'Đường đơn 5 Carbon cấu tạo dạng vòng 5 cạnh (Furanose)',
        ntbsRuleVi: isRNA
          ? 'Đường Ribose có nhóm -OH tự do ở vị trí C2\', làm phân tử mRNA linh hoạt hơn nhưng kém bền hơn DNA.'
          : 'Đường Deoxyribose ("De-oxy" = mất 1 oxygen ở vị trí C2\', chỉ còn -H) giúp chuỗi xoắn kép DNA cực kỳ bền vững.',
        hydrogenBondCount: 0,
        cycleNumber: 1,
        heightAngstrom: 0
      };

      // Pentagon vertices: O4' (top), C1' (right), C2' (bottom-right), C3' (bottom-left), C4' (left), plus exocyclic C5'
      const o4Pos = new THREE.Vector3(0, 3.2, 0);
      const c1Pos = new THREE.Vector3(3.6, 0.8, 0);
      const c2Pos = new THREE.Vector3(2.2, -3.2, 0);
      const c3Pos = new THREE.Vector3(-2.2, -3.2, 0);
      const c4Pos = new THREE.Vector3(-3.6, 0.8, 0);
      const c5Pos = new THREE.Vector3(-5.8, 3.0, 0);

      const sugarAtoms = [
        { pos: o4Pos, color: 0xef4444, r: 1.1, label: "O4' (oxygen trong vòng)" },
        { pos: c1Pos, color: 0x38bdf8, r: 1.15, label: "C1' (Nối base)" },
        { pos: c2Pos, color: 0x38bdf8, r: 1.15, label: "C2'" },
        { pos: c3Pos, color: 0x38bdf8, r: 1.15, label: "C3'" },
        { pos: c4Pos, color: 0x38bdf8, r: 1.15, label: "C4'" },
        { pos: c5Pos, color: 0x0ea5e9, r: 1.1, label: "C5' (-CH₂-)" }
      ];

      sugarAtoms.forEach((at) => {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(at.r, 24, 24),
          new THREE.MeshStandardMaterial({ color: at.color, roughness: 0.25, metalness: 0.25 })
        );
        addDynamic(m, at.pos, expSugar, 'backbone', inspectSugar);

        const lbl = createTextBadgeSprite(at.label, '#0F172A', '#7DD3FC', '#38BDF8', 3.6, 1.1);
        addDynamic(
          lbl,
          at.pos.clone().add(new THREE.Vector3(0, 1.55, 0.6)),
          expSugar,
          'baseLabels3D'
        );
      });

      const sugarRingBonds: [THREE.Vector3, THREE.Vector3][] = [
        [o4Pos, c1Pos],
        [c1Pos, c2Pos],
        [c2Pos, c3Pos],
        [c3Pos, c4Pos],
        [c4Pos, o4Pos],
        [c4Pos, c5Pos]
      ];
      sugarRingBonds.forEach(([a, b]) => {
        const cyl = createBondCylinder(a, b, 0.26, 0x7dd3fc);
        addDynamic(cyl, a, expSugar, 'backbone', inspectSugar);
      });

      // Phosphoester Bond connecting O (at -7.1, 3.0, 0) to C5' (-5.8, 3.0, 0)
      const esterO = pCenter.clone().add(new THREE.Vector3(3.1, -1.2, 0));
      const esterBond = createBondCylinder(esterO, c5Pos, 0.24, 0xfde047);
      addDynamic(esterBond, esterO, expSugar, 'hydrogenBonds', inspectPhosphate);

      // C3'-OH Group (Bottom Left - where next nucleotide attaches)
      const c3OhPos = c3Pos.clone().add(new THREE.Vector3(-1.4, -2.5, 0));
      const c3OhSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
      );
      addDynamic(c3OhSphere, c3OhPos, expSugar, 'backbone', inspectSugar);
      addDynamic(
        createBondCylinder(c3Pos, c3OhPos, 0.2, 0x94a3b8),
        c3Pos,
        expSugar,
        'backbone',
        inspectSugar
      );
      addDynamic(
        createTextBadgeSprite("-OH (Đầu 3')", '#064E3B', '#6EE7B7', '#10B981', 3.8, 1.15),
        c3OhPos.clone().add(new THREE.Vector3(0, -1.4, 0)),
        expSugar,
        'baseLabels3D'
      );

      // C2' Group: -H for Deoxyribose (DNA) vs -OH for Ribose (mRNA)
      const c2SubPos = c2Pos.clone().add(new THREE.Vector3(1.4, -2.5, 0));
      const c2SubSphere = new THREE.Mesh(
        new THREE.SphereGeometry(isRNA ? 0.88 : 0.68, 20, 20),
        new THREE.MeshStandardMaterial({
          color: isRNA ? 0xef4444 : 0xe2e8f0,
          roughness: 0.3
        })
      );
      addDynamic(c2SubSphere, c2SubPos, expSugar, 'backbone', inspectSugar);
      addDynamic(
        createBondCylinder(c2Pos, c2SubPos, 0.2, 0x94a3b8),
        c2Pos,
        expSugar,
        'backbone',
        inspectSugar
      );
      addDynamic(
        createTextBadgeSprite(
          isRNA ? "-OH (Ribose C2')" : "-H (Deoxy C2')",
          isRNA ? '#581C87' : '#0F172A',
          isRNA ? '#E9D5FF' : '#FDE68A',
          isRNA ? '#A855F7' : '#F59E0B',
          4.4,
          1.15
        ),
        c2SubPos.clone().add(new THREE.Vector3(0, -1.4, 0)),
        expSugar,
        'baseLabels3D'
      );

      const subBanner2 = createTextBadgeSprite(
        isRNA ? '② ĐƯỜNG RIBOSE (C₅H₁₀O₅)' : '② ĐƯỜNG DEOXYRIBOSE (C₅H₁₀O₄)',
        '#0C4A6E',
        '#7DD3FC',
        '#38BDF8',
        8.2,
        1.5
      );
      addDynamic(subBanner2, new THREE.Vector3(0, 9.2, 0), expSugar, 'sgkRuler3D');

      // -----------------------------------------------------------------------
      // SUBUNIT 3: BASE NITROGEN (A, T, G, C, U) at Right (+10.5, 1.5, 0)
      // -----------------------------------------------------------------------
      const inspectBase: InspectableSubunit = {
        id: `nuc-base-${selectedNucleotideBase}`,
        stepIndex: 1,
        partType: 'BASE_STRAND_1',
        baseCode: selectedNucleotideBase,
        partnerBaseCode: baseCfg.partnerCode,
        strandLabel: 'Cấu tạo đơn phân Nucleotide',
        titleVi: `③ Base nitrogen ${baseCfg.vietnameseName}`,
        chemicalFormula: baseCfg.chemicalFormula,
        chemicalGroupVi: baseCfg.groupType,
        ntbsRuleVi: baseCfg.ntbsSummary,
        hydrogenBondCount: baseCfg.hBonds,
        cycleNumber: 1,
        heightAngstrom: 1.5
      };

      // β-N-Glycosidic Bond from C1' (3.6, 0.8, 0) to Base attachment atom (7.2, 0.8, 0)
      const baseAttachPos = new THREE.Vector3(7.2, 0.8, 0);
      const glycoBond = createBondCylinder(c1Pos, baseAttachPos, 0.25, 0x34d399);
      addDynamic(glycoBond, c1Pos, expBase, 'hydrogenBonds', inspectBase);
      addDynamic(
        createTextBadgeSprite('Liên kết β-N-Glycosidic', '#064E3B', '#A7F3D0', '#10B981', 5.4, 1.15),
        new THREE.Vector3(5.4, -1.1, 0),
        expBase,
        'baseLabels3D'
      );

      const baseColor = new THREE.Color(baseCfg.colorHex).getHex();

      if (isPurine) {
        // Purine (A or G): Fused 5-membered Imidazole ring + 6-membered Pyrimidine ring
        const r5 = [
          baseAttachPos, // N9
          new THREE.Vector3(8.5, 2.8, 0), // C8
          new THREE.Vector3(10.8, 2.2, 0), // N7
          new THREE.Vector3(10.8, -0.6, 0), // C5
          new THREE.Vector3(8.5, -1.2, 0) // C4
        ];
        const r6 = [
          r5[2], // C5
          new THREE.Vector3(13.0, 3.2, 0), // C6
          new THREE.Vector3(15.0, 1.8, 0), // N1
          new THREE.Vector3(15.0, -0.8, 0), // C2
          new THREE.Vector3(13.0, -2.0, 0), // N3
          r5[4] // C4
        ];

        const purineNodes = [
          { p: r5[0], isN: true, lbl: 'N9' },
          { p: r5[1], isN: false, lbl: 'C8' },
          { p: r5[2], isN: true, lbl: 'N7' },
          { p: r5[3], isN: false, lbl: 'C5' },
          { p: r5[4], isN: false, lbl: 'C4' },
          { p: r6[1], isN: false, lbl: 'C6' },
          { p: r6[2], isN: true, lbl: 'N1' },
          { p: r6[3], isN: false, lbl: 'C2' },
          { p: r6[4], isN: true, lbl: 'N3' }
        ];

        purineNodes.forEach((nd) => {
          const sp = new THREE.Mesh(
            new THREE.SphereGeometry(0.95, 24, 24),
            new THREE.MeshStandardMaterial({
              color: nd.isN ? 0x3b82f6 : baseColor,
              roughness: 0.25,
              metalness: 0.25
            })
          );
          addDynamic(sp, nd.p, expBase, 'nucleobase', inspectBase);
        });

        const purineEdges: [THREE.Vector3, THREE.Vector3][] = [
          [r5[0], r5[1]],
          [r5[1], r5[2]],
          [r5[2], r5[3]],
          [r5[3], r5[4]],
          [r5[4], r5[0]],
          [r5[3], r6[1]],
          [r6[1], r6[2]],
          [r6[2], r6[3]],
          [r6[3], r6[4]],
          [r6[4], r5[4]]
        ];
        purineEdges.forEach(([a, b]) => {
          addDynamic(createBondCylinder(a, b, 0.24, baseColor), a, expBase, 'nucleobase', inspectBase);
        });

        // Functional group at C6 (-NH2 for A, =O for G)
        const c6FuncPos = r6[1].clone().add(new THREE.Vector3(0.4, 2.3, 0));
        const c6FuncMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 20, 20),
          new THREE.MeshStandardMaterial({
            color: selectedNucleotideBase === 'A' ? 0x3b82f6 : 0xef4444
          })
        );
        addDynamic(c6FuncMesh, c6FuncPos, expBase, 'nucleobase', inspectBase);
        addDynamic(
          createBondCylinder(r6[1], c6FuncPos, 0.2, 0x94a3b8),
          r6[1],
          expBase,
          'nucleobase',
          inspectBase
        );
        addDynamic(
          createTextBadgeSprite(
            selectedNucleotideBase === 'A' ? '-NH₂ (Amin)' : '=O (Ceton)',
            '#0F172A',
            '#FFFFFF',
            baseCfg.colorHex,
            3.6,
            1.1
          ),
          c6FuncPos.clone().add(new THREE.Vector3(0, 1.3, 0)),
          expBase,
          'baseLabels3D'
        );
      } else {
        // Pyrimidine (T, C, or U): Single 6-membered hexagonal ring
        const hexCenter = new THREE.Vector3(10.2, 0.8, 0);
        const radiusR = 3.0;
        const hexPts: THREE.Vector3[] = [];
        for (let k = 0; k < 6; k++) {
          const ang = Math.PI - (k * Math.PI) / 3;
          hexPts.push(
            new THREE.Vector3(
              hexCenter.x + radiusR * Math.cos(ang),
              hexCenter.y + radiusR * Math.sin(ang),
              0
            )
          );
        }

        hexPts.forEach((pt, idx) => {
          const isN = idx === 0 || idx === 2;
          const sp = new THREE.Mesh(
            new THREE.SphereGeometry(0.98, 24, 24),
            new THREE.MeshStandardMaterial({
              color: isN ? 0x3b82f6 : baseColor,
              roughness: 0.25,
              metalness: 0.25
            })
          );
          addDynamic(sp, pt, expBase, 'nucleobase', inspectBase);
          const nextPt = hexPts[(idx + 1) % 6];
          addDynamic(
            createBondCylinder(pt, nextPt, 0.24, baseColor),
            pt,
            expBase,
            'nucleobase',
            inspectBase
          );
        });

        // Exocyclic functional group at C4/C5 (e.g. -CH3 on Thymine vs H on Uracil!)
        const topFunctionalPos = hexPts[1].clone().add(new THREE.Vector3(0, 2.3, 0));
        const topFuncSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.88, 20, 20),
          new THREE.MeshStandardMaterial({
            color:
              selectedNucleotideBase === 'C'
                ? 0x3b82f6
                : selectedNucleotideBase === 'T'
                ? 0xf59e0b
                : 0xa855f7
          })
        );
        addDynamic(topFuncSphere, topFunctionalPos, expBase, 'nucleobase', inspectBase);
        addDynamic(
          createBondCylinder(hexPts[1], topFunctionalPos, 0.2, 0x94a3b8),
          hexPts[1],
          expBase,
          'nucleobase',
          inspectBase
        );
        addDynamic(
          createTextBadgeSprite(
            selectedNucleotideBase === 'T'
              ? 'Nhóm -CH₃ (Đặc trưng T)'
              : selectedNucleotideBase === 'U'
              ? 'Không có -CH₃ (Uracil)'
              : 'Nhóm -NH₂ (Cytosine)',
            '#0F172A',
            '#FFFFFF',
            baseCfg.colorHex,
            4.8,
            1.15
          ),
          topFunctionalPos.clone().add(new THREE.Vector3(0, 1.35, 0)),
          expBase,
          'baseLabels3D'
        );
      }

      const subBanner3 = createTextBadgeSprite(
        `③ BASE NITROGEN: ${baseCfg.code} (${baseCfg.nucleotideFormula})`,
        '#064E3B',
        '#FFFFFF',
        baseCfg.colorHex,
        8.2,
        1.5
      );
      addDynamic(subBanner3, new THREE.Vector3(11.0, 9.2, 0), expBase, 'sgkRuler3D');

      return;
    }

    // =========================================================================
    // TAB 4: SO SÁNH 2 MÔ HÌNH DNA VÀ mRNA (DNA_VS_MRNA)
    // =========================================================================
    if (activeTab === 'DNA_VS_MRNA') {
      const bottomY = steps[0]?.yAngstrom ?? -15.3;
      const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;
      if (wristGimbalRingRef.current) {
        wristGimbalRingRef.current.position.set(0, bottomY - 4.0, 0);
      }

      const dnaOffsetX = -12.8;
      const mrnaOffsetX = 12.8;
      const radiusDNA = 7.4;
      const radiusMRNA = 5.6;

      // Top & Bottom Comparison Header Badges
      addDynamic(
        createTextBadgeSprite(
          'DNA XOẮN KÉP (2 MẠCH · A, T, G, C)',
          '#0C4A6E',
          '#38BDF8',
          '#38BDF8',
          10.2,
          1.7
        ),
        new THREE.Vector3(dnaOffsetX, topY + 4.2, 0),
        new THREE.Vector3(0, 0, 0),
        'sgkRuler3D'
      );

      addDynamic(
        createTextBadgeSprite(
          'mRNA MẠCH ĐƠN (5\'→3\' · A, U, G, C)',
          '#4C1D95',
          '#E9D5FF',
          '#A855F7',
          10.2,
          1.7
        ),
        new THREE.Vector3(mrnaOffsetX, topY + 4.2, 0),
        new THREE.Vector3(0, 0, 0),
        'sgkRuler3D'
      );

      addDynamic(
        createTextBadgeSprite(
          'Đường Deoxyribose (C₅H₁₀O₄) · Bền vững',
          '#0F172A',
          '#7DD3FC',
          '#0284C7',
          9.4,
          1.45
        ),
        new THREE.Vector3(dnaOffsetX, bottomY - 3.6, 0),
        new THREE.Vector3(0, 0, 0),
        'sgkRuler3D'
      );

      addDynamic(
        createTextBadgeSprite(
          'Đường Ribose (C₅H₁₀O₅) · Thay T bằng U',
          '#0F172A',
          '#D8B4FE',
          '#9333EA',
          9.4,
          1.45
        ),
        new THREE.Vector3(mrnaOffsetX, bottomY - 3.6, 0),
        new THREE.Vector3(0, 0, 0),
        'sgkRuler3D'
      );

      const dnaCurve1: THREE.Vector3[] = [];
      const dnaCurve2: THREE.Vector3[] = [];
      const mrnaCurve: THREE.Vector3[] = [];

      steps.forEach((step) => {
        const y = step.yAngstrom;
        const theta1 = step.twistAngleRad;
        const theta2 = theta1 + Math.PI;

        // --- LEFT: DNA Double Helix ---
        const p1 = new THREE.Vector3(
          dnaOffsetX + radiusDNA * Math.cos(theta1),
          y,
          radiusDNA * Math.sin(theta1)
        );
        const p2 = new THREE.Vector3(
          dnaOffsetX + radiusDNA * Math.cos(theta2),
          y,
          radiusDNA * Math.sin(theta2)
        );
        dnaCurve1.push(p1);
        dnaCurve2.push(p2);

        const cfg1 = BASE_VISUAL_CONFIG[step.strand1Base];
        const cfg2 = BASE_VISUAL_CONFIG[step.strand2Base];

        const midDNA = new THREE.Vector3(dnaOffsetX, y, 0);
        const dir1 = midDNA.clone().sub(p1).normalize();
        const dir2 = midDNA.clone().sub(p2).normalize();

        const c1 = p1.clone().addScaledVector(dir1, 3.0);
        const c2 = p2.clone().addScaledVector(dir2, 3.0);

        const plate1 = new THREE.Mesh(
          new THREE.BoxGeometry(5.2, 0.5, 1.8),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(cfg1.colorHex),
            roughness: 0.25,
            metalness: 0.25
          })
        );
        plate1.rotation.y = -theta1;
        const inspectDna1: InspectableSubunit = {
          id: `comp-dna1-${step.stepIndex}`,
          stepIndex: step.stepIndex,
          partType: 'BASE_STRAND_1',
          baseCode: step.strand1Base,
          partnerBaseCode: step.strand2Base,
          strandLabel: "Mạch 1 (5' → 3')",
          titleVi: `[DNA] Nucleotide ${cfg1.vietnameseName}`,
          chemicalFormula: cfg1.chemicalFormula,
          chemicalGroupVi: `DNA 2 mạch · Đường Deoxyribose (C₅H₁₀O₄)`,
          ntbsRuleVi: cfg1.ntbsSummary,
          hydrogenBondCount: step.hydrogenBonds,
          cycleNumber: step.cycleNumber,
          heightAngstrom: y
        };
        addDynamic(plate1, c1, new THREE.Vector3(-6, 0, 0), 'nucleobase', inspectDna1);

        const plate2 = new THREE.Mesh(
          new THREE.BoxGeometry(5.2, 0.5, 1.8),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(cfg2.colorHex),
            roughness: 0.25,
            metalness: 0.25
          })
        );
        plate2.rotation.y = -theta2;
        const inspectDna2: InspectableSubunit = {
          id: `comp-dna2-${step.stepIndex}`,
          stepIndex: step.stepIndex,
          partType: 'BASE_STRAND_2',
          baseCode: step.strand2Base,
          partnerBaseCode: step.strand1Base,
          strandLabel: "Mạch 2 (3' → 5')",
          titleVi: `[DNA Mạch Khuôn] Nucleotide ${cfg2.vietnameseName}`,
          chemicalFormula: cfg2.chemicalFormula,
          chemicalGroupVi: `Mạch gốc 3'→5' làm khuôn phiên mã ra mRNA`,
          ntbsRuleVi: `Khi phiên mã, ${step.strand2Base} trên mạch gốc 3'→5' bắt cặp bổ sung tạo ra ${step.mrnaBase} trên phân tử mRNA (5'→3').`,
          hydrogenBondCount: step.hydrogenBonds,
          cycleNumber: step.cycleNumber,
          heightAngstrom: y
        };
        addDynamic(plate2, c2, new THREE.Vector3(3, 0, 0), 'nucleobase', inspectDna2);

        const lblDna1 = createTextBadgeSprite(step.strand1Base, cfg1.colorHex, '#07090E', '#FFFFFF', 1.6, 0.85);
        addDynamic(
          lblDna1,
          c1.clone().add(new THREE.Vector3(0, 0.75, 0)),
          new THREE.Vector3(-6, 0, 0),
          'baseLabels3D'
        );

        const lblDna2 = createTextBadgeSprite(step.strand2Base, cfg2.colorHex, '#07090E', '#FFFFFF', 1.6, 0.85);
        addDynamic(
          lblDna2,
          c2.clone().add(new THREE.Vector3(0, 0.75, 0)),
          new THREE.Vector3(3, 0, 0),
          'baseLabels3D'
        );

        // --- RIGHT: Single-Stranded mRNA (5' -> 3') ---
        const pMrna = new THREE.Vector3(
          mrnaOffsetX + radiusMRNA * Math.cos(theta1),
          y,
          radiusMRNA * Math.sin(theta1)
        );
        mrnaCurve.push(pMrna);

        // Ribose Sugar Sphere with 2'-OH highlight on mRNA backbone
        const riboseSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 18, 18),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.3 })
        );
        addDynamic(riboseSphere, pMrna, new THREE.Vector3(6, 0, 0), 'backbone');

        const cfgMrna = BASE_VISUAL_CONFIG[step.mrnaBase];
        const midMrna = new THREE.Vector3(mrnaOffsetX, y, 0);
        const dirMrna = midMrna.clone().sub(pMrna).normalize();
        const cMrna = pMrna.clone().addScaledVector(dirMrna, 2.6);

        const mrnaPlate = new THREE.Mesh(
          new THREE.BoxGeometry(4.6, 0.55, 1.95),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(cfgMrna.colorHex),
            emissive: new THREE.Color(step.mrnaBase === 'U' ? '#7E22CE' : cfgMrna.emissiveHex),
            emissiveIntensity: step.mrnaBase === 'U' ? 0.55 : 0.2,
            roughness: 0.22,
            metalness: 0.25
          })
        );
        mrnaPlate.rotation.y = -theta1;

        const inspectMrna: InspectableSubunit = {
          id: `comp-mrna-${step.stepIndex}`,
          stepIndex: step.stepIndex,
          partType: 'MRNA_BASE',
          baseCode: step.mrnaBase,
          partnerBaseCode: step.strand2Base,
          strandLabel: "Mạch đơn mRNA (5' → 3')",
          titleVi: `[mRNA] Ribonucleotide ${cfgMrna.vietnameseName}`,
          chemicalFormula:
            step.mrnaBase === 'U'
              ? 'C₄H₄N₂O₂ (Uracil) · Đường Ribose C₅H₁₀O₅'
              : `${cfgMrna.nucleotideFormula} · Đường Ribose C₅H₁₀O₅`,
          chemicalGroupVi:
            step.mrnaBase === 'U'
              ? 'base Uracil (U) thay thế cho Thymine (T) trên mRNA'
              : 'Đơn phân Ribonucleotide trên mạch đơn mRNA',
          ntbsRuleVi:
            step.mrnaBase === 'U'
              ? `Trên mRNA, Uracil (U) thay thế hoàn toàn cho Thymine (T) và được phiên mã từ Adenine (A) trên mạch gốc 3'→5' của DNA.`
              : `Ribonucleotide ${step.mrnaBase} trên mRNA (5'→3') được phiên mã bổ sung từ ${step.strand2Base} trên mạch khuôn DNA (3'→5').`,
          hydrogenBondCount: 0,
          cycleNumber: step.cycleNumber,
          heightAngstrom: y
        };
        addDynamic(mrnaPlate, cMrna, new THREE.Vector3(6, 0, 0), 'nucleobase', inspectMrna);

        const lblMrna = createTextBadgeSprite(
          step.mrnaBase === 'U' ? 'U (mRNA)' : step.mrnaBase,
          cfgMrna.colorHex,
          step.mrnaBase === 'U' ? '#FFFFFF' : '#07090E',
          '#FFFFFF',
          step.mrnaBase === 'U' ? 2.5 : 1.65,
          0.9
        );
        addDynamic(
          lblMrna,
          cMrna.clone().add(new THREE.Vector3(0, 0.8, 0)),
          new THREE.Vector3(6, 0, 0),
          'baseLabels3D'
        );
      });

      if (dnaCurve1.length >= 2) {
        const t1 = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dnaCurve1), dnaCurve1.length * 8, 0.42, 14, false),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.45 })
        );
        addDynamic(t1, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-6, 0, 0), 'backbone');

        const t2 = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dnaCurve2), dnaCurve2.length * 8, 0.42, 14, false),
          new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.25, metalness: 0.45 })
        );
        addDynamic(t2, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0), 'backbone');

        const tMrna = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mrnaCurve), mrnaCurve.length * 8, 0.46, 14, false),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.45 })
        );
        addDynamic(tMrna, new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 0), 'backbone');
      }

      return;
    }

    // =========================================================================
    // TAB 2: MÔ HÌNH DNA DẠNG PHÂN TỬ (MOLECULAR_DNA - Ball-and-Stick 3D)
    // =========================================================================
    if (activeTab === 'MOLECULAR_DNA') {
      const radiusHelix = 10.2;
      const bottomY = steps[0]?.yAngstrom ?? -15.3;
      const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;

      if (wristGimbalRingRef.current) {
        wristGimbalRingRef.current.position.set(0, bottomY - 3.8, 0);
      }

      addDynamic(
        createTextBadgeSprite(
          'MÔ HÌNH DNA DẠNG PHÂN TỬ (BALL & STICK · PO₄³⁻ · C₅H₁₀O₄ · A,T,G,C)',
          '#0F172A',
          '#38BDF8',
          '#38BDF8',
          13.8,
          1.7
        ),
        new THREE.Vector3(0, topY + 3.8, 0),
        new THREE.Vector3(0, 0, 0),
        'sgkRuler3D'
      );

      let prevP1: THREE.Vector3 | null = null;
      let prevP2: THREE.Vector3 | null = null;

      steps.forEach((step) => {
        const y = step.yAngstrom;
        const theta1 = step.twistAngleRad;
        const theta2 = theta1 + Math.PI;

        const explode1 = new THREE.Vector3(-14 + Math.cos(theta1) * 4, 0, Math.sin(theta1) * 4);
        const explode2 = new THREE.Vector3(14 + Math.cos(theta2) * 4, 0, Math.sin(theta2) * 4);

        const cfg1 = BASE_VISUAL_CONFIG[step.strand1Base];
        const cfg2 = BASE_VISUAL_CONFIG[step.strand2Base];

        // Helper to build one full Nucleotide in Molecular Ball-and-Stick on either strand
        const buildMolecularStrandStep = (
          theta: number,
          baseCode: NucleotideCode,
          partnerCode: NucleotideCode,
          strandNo: 1 | 2,
          expVec: THREE.Vector3
        ) => {
          const cfg = BASE_VISUAL_CONFIG[baseCode];
          const pPos = new THREE.Vector3(
            radiusHelix * Math.cos(theta),
            y,
            radiusHelix * Math.sin(theta)
          );
          const inwardDir = pPos.clone().negate().setY(0).normalize();
          const tangentDir = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));

          // 1. Phosphate Group (-PO4) at outer radius
          const inspectPhos: InspectableSubunit = {
            id: `mol-phos-${strandNo}-${step.stepIndex}`,
            stepIndex: step.stepIndex,
            partType: 'PHOSPHATE_GROUP',
            baseCode,
            partnerBaseCode: partnerCode,
            strandLabel: strandNo === 1 ? "Mạch 1 (5' → 3')" : "Mạch 2 (3' → 5')",
            titleVi: `Nhóm phosphate (-PO₄³⁻) · Bậc #${step.stepIndex}`,
            chemicalFormula: 'PO₄³⁻ (Nguyên tử P màu cam + 4 nguyên tử O màu đỏ)',
            chemicalGroupVi: 'Liên kết cộng hóa trị phosphodiester dọc khung xương DNA',
            ntbsRuleVi:
              'Các nhóm phosphate (-PO₄³⁻) nối giữa C5\' và C3\' của 2 đường Deoxyribose kế tiếp tạo thành khung xương vững chắc bên ngoài chuỗi xoắn kép.',
            hydrogenBondCount: step.hydrogenBonds,
            cycleNumber: step.cycleNumber,
            heightAngstrom: y
          };

          const pSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.68, 18, 18),
            new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.25, metalness: 0.3 })
          );
          addDynamic(pSphere, pPos, expVec, 'backbone', inspectPhos);

          // 3 peripheral Oxygen spheres on the Phosphate group
          const oxOffsets = [
            inwardDir.clone().multiplyScalar(-0.95),
            new THREE.Vector3(0, 0.85, 0),
            tangentDir.clone().multiplyScalar(0.85)
          ];
          oxOffsets.forEach((off) => {
            const oPos = pPos.clone().add(off);
            const oSphere = new THREE.Mesh(
              new THREE.SphereGeometry(0.42, 14, 14),
              new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
            );
            addDynamic(oSphere, oPos, expVec, 'backbone', inspectPhos);
          });

          // 2. Deoxyribose Pentagon Sugar Ring (C5H10O4) slightly inward from Phosphate
          const sugarCenter = pPos.clone().addScaledVector(inwardDir, 2.3);
          const inspectSugar: InspectableSubunit = {
            id: `mol-sugar-${strandNo}-${step.stepIndex}`,
            stepIndex: step.stepIndex,
            partType: 'DEOXYRIBOSE_SUGAR',
            baseCode,
            partnerBaseCode: partnerCode,
            strandLabel: strandNo === 1 ? "Mạch 1 (5' → 3')" : "Mạch 2 (3' → 5')",
            titleVi: `Đường Deoxyribose (C₅H₁₀O₄) · Bậc #${step.stepIndex}`,
            chemicalFormula: 'C₅H₁₀O₄ (Vòng 5 cạnh: C1\', C2\', C3\', C4\', O4\' và C5\')',
            chemicalGroupVi: 'Đường pentose 5 Carbon gắn với Base nitrogen tại C1\'',
            ntbsRuleVi:
              'Vòng đường Deoxyribose kết nối khung phosphate bên ngoài với Base nitrogen hướng vào tâm xoắn.',
            hydrogenBondCount: step.hydrogenBonds,
            cycleNumber: step.cycleNumber,
            heightAngstrom: y
          };

          addDynamic(
            createBondCylinder(pPos, sugarCenter, 0.16, 0x94a3b8),
            pPos,
            expVec,
            'backbone',
            inspectSugar
          );

          const pentPts: THREE.Vector3[] = [];
          for (let k = 0; k < 5; k++) {
            const ang = (k * 2 * Math.PI) / 5;
            const pt = sugarCenter
              .clone()
              .addScaledVector(inwardDir, Math.cos(ang) * 0.95)
              .addScaledVector(tangentDir, Math.sin(ang) * 0.95);
            pentPts.push(pt);
            const atomMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.44, 14, 14),
              new THREE.MeshStandardMaterial({
                color: k === 0 ? 0xef4444 : 0x38bdf8,
                roughness: 0.25
              })
            );
            addDynamic(atomMesh, pt, expVec, 'backbone', inspectSugar);
          }
          for (let k = 0; k < 5; k++) {
            addDynamic(
              createBondCylinder(pentPts[k], pentPts[(k + 1) % 5], 0.14, 0x38bdf8),
              pentPts[k],
              expVec,
              'backbone',
              inspectSugar
            );
          }

          // 3. Heterocyclic Base Ring (Purine 2-ring or Pyrimidine 1-ring) extending to center
          const baseCenter = pPos.clone().addScaledVector(inwardDir, 5.8);
          const inspectBase: InspectableSubunit = {
            id: `mol-base-${strandNo}-${step.stepIndex}`,
            stepIndex: step.stepIndex,
            partType: strandNo === 1 ? 'BASE_STRAND_1' : 'BASE_STRAND_2',
            baseCode,
            partnerBaseCode: partnerCode,
            strandLabel: strandNo === 1 ? "Mạch 1 (5' → 3')" : "Mạch 2 (3' → 5')",
            titleVi: `Phân tử ${cfg.vietnameseName} · Bậc #${step.stepIndex}`,
            chemicalFormula: cfg.chemicalFormula,
            chemicalGroupVi: cfg.groupType,
            ntbsRuleVi: cfg.ntbsSummary,
            hydrogenBondCount: step.hydrogenBonds,
            cycleNumber: step.cycleNumber,
            heightAngstrom: y
          };

          addDynamic(
            createBondCylinder(sugarCenter, baseCenter, 0.16, new THREE.Color(cfg.colorHex).getHex()),
            sugarCenter,
            expVec,
            'nucleobase',
            inspectBase
          );

          const ringCount = baseCode === 'A' || baseCode === 'G' ? 6 : 6;
          const baseHexPts: THREE.Vector3[] = [];
          for (let k = 0; k < ringCount; k++) {
            const ang = (k * 2 * Math.PI) / ringCount;
            const rScale = baseCode === 'A' || baseCode === 'G' ? 1.45 : 1.15;
            const pt = baseCenter
              .clone()
              .addScaledVector(inwardDir, Math.cos(ang) * rScale)
              .addScaledVector(tangentDir, Math.sin(ang) * 1.1);
            baseHexPts.push(pt);

            const isNitrogen = k % 2 === 1;
            const atomMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.52, 16, 16),
              new THREE.MeshStandardMaterial({
                color: isNitrogen ? 0x3b82f6 : new THREE.Color(cfg.colorHex).getHex(),
                roughness: 0.22,
                metalness: 0.25
              })
            );
            addDynamic(atomMesh, pt, expVec, 'nucleobase', inspectBase);
          }
          for (let k = 0; k < ringCount; k++) {
            addDynamic(
              createBondCylinder(
                baseHexPts[k],
                baseHexPts[(k + 1) % ringCount],
                0.16,
                new THREE.Color(cfg.colorHex).getHex()
              ),
              baseHexPts[k],
              expVec,
              'nucleobase',
              inspectBase
            );
          }

          // Badge above base
          const badge = createTextBadgeSprite(
            `${baseCode} (${cfg.nucleotideFormula})`,
            cfg.colorHex,
            '#07090E',
            '#FFFFFF',
            2.65,
            0.95
          );
          addDynamic(
            badge,
            baseCenter.clone().add(new THREE.Vector3(0, 0.9, 0)),
            expVec,
            'baseLabels3D'
          );

          return pPos;
        };

        const curP1 = buildMolecularStrandStep(
          theta1,
          step.strand1Base,
          step.strand2Base,
          1,
          explode1
        );
        const curP2 = buildMolecularStrandStep(
          theta2,
          step.strand2Base,
          step.strand1Base,
          2,
          explode2
        );

        // Phosphodiester Backbone Connector Sticks between consecutive nucleotides
        if (prevP1) {
          addDynamic(
            createBondCylinder(prevP1, curP1, 0.22, 0x38bdf8),
            prevP1,
            explode1,
            'backbone'
          );
        }
        if (prevP2) {
          addDynamic(
            createBondCylinder(prevP2, curP2, 0.22, 0xc084fc),
            prevP2,
            explode2,
            'backbone'
          );
        }
        prevP1 = curP1;
        prevP2 = curP2;

        // Dotted Hydrogen Bond Spheres across the helix center (2 for A=T, 3 for G≡C)
        const hCount = step.hydrogenBonds;
        const zOffsets = hCount === 2 ? [-0.6, 0.6] : [-0.8, 0, 0.8];
        const perpZDir = new THREE.Vector3(-Math.sin(theta1), 0, Math.cos(theta1));

        zOffsets.forEach((zOff, idx) => {
          const inspectHBond: InspectableSubunit = {
            id: `mol-hbond-${step.stepIndex}-${idx}`,
            stepIndex: step.stepIndex,
            partType: 'HYDROGEN_BOND',
            baseCode: step.strand1Base,
            partnerBaseCode: step.strand2Base,
            strandLabel: 'Cầu nối / Trục tâm xoắn',
            titleVi: `Liên kết hydrogen phân tử (${step.strand1Base} ${hCount === 2 ? '=' : '≡'} ${step.strand2Base})`,
            chemicalFormula:
              hCount === 2 ? '2 cầu nối N–H···O / N···H–N' : '3 cầu nối N–H···O / N–H···N',
            chemicalGroupVi: `Lực hút tĩnh điện giữa nguyên tử H mang điện dương và O/N mang điện âm`,
            ntbsRuleVi: cfg1.ntbsSummary,
            hydrogenBondCount: hCount,
            cycleNumber: step.cycleNumber,
            heightAngstrom: y
          };

          [-0.9, 0, 0.9].forEach((dotX) => {
            const dotPos = new THREE.Vector3(
              Math.cos(theta1) * dotX,
              y,
              Math.sin(theta1) * dotX
            ).addScaledVector(perpZDir, zOff);

            const dotMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.22, 12, 12),
              new THREE.MeshBasicMaterial({
                color: hCount === 3 ? 0x67e8f9 : 0xfde68a
              })
            );
            addDynamic(
              dotMesh,
              dotPos,
              new THREE.Vector3(0, 0, 0),
              'hydrogenBonds',
              inspectHBond
            );
          });
        });
      });

      return;
    }

    // =========================================================================
    // TAB 1 (DEFAULT): MÔ HÌNH DNA ĐƠN GIẢN WATSON & CRICK (1953)
    // =========================================================================
    const radiusHelix = 10.0;
    const bottomY = steps[0]?.yAngstrom ?? -15.3;
    const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;
    const totalHeight = Math.max(10, topY - bottomY + 5);

    if (wristGimbalRingRef.current) {
      wristGimbalRingRef.current.position.set(0, bottomY - 3.5, 0);
    }

    const standGroup = new THREE.Group();

    const rodGeo = new THREE.CylinderGeometry(0.28, 0.28, totalHeight + 6, 20);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.85
    });
    const centralRod = new THREE.Mesh(rodGeo, rodMat);
    centralRod.position.set(0, (bottomY + topY) * 0.5 - 1.2, 0);

    const inspectAxis: InspectableSubunit = {
      id: 'watson-crick-central-rod',
      stepIndex: 1,
      partType: 'CENTRAL_AXIS',
      baseCode: 'A',
      partnerBaseCode: 'T',
      strandLabel: 'Cầu nối / Trục tâm xoắn',
      titleVi: 'Trục Tâm Xoắn Thẳng Đứng (Watson & Crick 1953)',
      chemicalFormula: 'Đường kính trụ xoắn D = 20 Å · Chu kỳ L = 34 Å',
      chemicalGroupVi: 'Trục đối xứng trung tâm của chuỗi xoắn kép B-DNA',
      ntbsRuleVi:
        'Giơ 2 ngón tay chữ V (✌️) để nhìn thẳng từ đỉnh trục này xuống và quan sát hình trụ tròn 20 Å đối xứng qua tâm.',
      hydrogenBondCount: 2,
      cycleNumber: 1,
      heightAngstrom: 0
    };
    centralRod.userData = { inspectable: inspectAxis };
    standGroup.add(centralRod);
    raycastTargetsRef.current.push(centralRod);

    const pedestalDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.6, 1.1, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.6
      })
    );
    pedestalDisc.position.set(0, bottomY - 3.6, 0);
    standGroup.add(pedestalDisc);

    const pedestalRing = new THREE.Mesh(
      new THREE.TorusGeometry(7.2, 0.18, 16, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    pedestalRing.rotation.x = Math.PI / 2;
    pedestalRing.position.set(0, bottomY - 3.05, 0);
    standGroup.add(pedestalRing);

    const handleGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.1, 5.2, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.4
      })
    );
    handleGrip.position.set(0, bottomY - 6.5, 0);
    standGroup.add(handleGrip);

    const modelPlaque = createTextBadgeSprite(
      'WATSON & CRICK (1953)',
      '#0F172A',
      '#38BDF8',
      '#38BDF8',
      6.5,
      1.5
    );
    modelPlaque.position.set(0, bottomY - 3.6, 7.4);
    standGroup.add(modelPlaque);

    const topTurnIndex = Math.min(steps.length - 1, 9);
    const topTurnY = steps[topTurnIndex]?.yAngstrom ?? 15.3;
    const rulerX = 14.2;

    const bracketPts = [
      new THREE.Vector3(rulerX - 1.5, bottomY, 0),
      new THREE.Vector3(rulerX, bottomY, 0),
      new THREE.Vector3(rulerX, topTurnY, 0),
      new THREE.Vector3(rulerX - 1.5, topTurnY, 0)
    ];
    const bracketLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(bracketPts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8 })
    );
    standGroup.add(bracketLine);

    const turnLabel = createTextBadgeSprite(
      steps.length >= 10 ? '1 Chu kỳ = 34 Å' : `Cao = ${(steps.length * 3.4).toFixed(1)} Å`,
      '#0F172A',
      '#38BDF8',
      '#38BDF8',
      5.8,
      1.65
    );
    turnLabel.position.set(rulerX + 3.4, (bottomY + topTurnY) * 0.5, 0);
    standGroup.add(turnLabel);

    addDynamic(standGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 'sgkRuler3D');

    const strand1CurvePoints: THREE.Vector3[] = [];
    const strand2CurvePoints: THREE.Vector3[] = [];

    steps.forEach((step) => {
      const y = step.yAngstrom;
      const theta1 = step.twistAngleRad;
      const theta2 = theta1 + Math.PI;

      const p1 = new THREE.Vector3(
        radiusHelix * Math.cos(theta1),
        y,
        radiusHelix * Math.sin(theta1)
      );
      const p2 = new THREE.Vector3(
        radiusHelix * Math.cos(theta2),
        y,
        radiusHelix * Math.sin(theta2)
      );
      strand1CurvePoints.push(p1);
      strand2CurvePoints.push(p2);

      const explode1 = new THREE.Vector3(-14 + Math.cos(theta1) * 4, 0, Math.sin(theta1) * 4);
      const explode2 = new THREE.Vector3(14 + Math.cos(theta2) * 4, 0, Math.sin(theta2) * 4);

      const cfg1 = BASE_VISUAL_CONFIG[step.strand1Base];
      const cfg2 = BASE_VISUAL_CONFIG[step.strand2Base];

      const gapCenter = 0.9;
      const span = radiusHelix - 0.6 - gapCenter;
      const plateLen1 = span * (cfg1.barLengthRatio * 2);
      const plateLen2 = span * (cfg2.barLengthRatio * 2);

      const dir1 = p1.clone().negate().setY(0).normalize();
      const dir2 = p2.clone().negate().setY(0).normalize();

      const center1 = p1.clone().addScaledVector(dir1, 0.6 + plateLen1 * 0.5);
      const center2 = p2.clone().addScaledVector(dir2, 0.6 + plateLen2 * 0.5);

      const plateGeo1 = new THREE.BoxGeometry(plateLen1, 0.55, 2.35);
      const plateMat1 = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cfg1.colorHex),
        emissive: new THREE.Color(step.isMutated ? '#F43F5E' : cfg1.emissiveHex),
        emissiveIntensity: step.isMutated ? 0.6 : 0.2,
        roughness: 0.25,
        metalness: 0.25
      });
      const plateMesh1 = new THREE.Mesh(plateGeo1, plateMat1);
      plateMesh1.rotation.y = -theta1;

      const inspectPlate1: InspectableSubunit = {
        id: `wc-plate1-${step.stepIndex}`,
        stepIndex: step.stepIndex,
        partType: 'BASE_STRAND_1',
        baseCode: step.strand1Base,
        partnerBaseCode: step.strand2Base,
        strandLabel: "Mạch 1 (5' → 3')",
        titleVi: `Nucleotide ${cfg1.vietnameseName}`,
        chemicalFormula: cfg1.chemicalFormula,
        chemicalGroupVi: cfg1.groupType,
        ntbsRuleVi: cfg1.ntbsSummary,
        hydrogenBondCount: step.hydrogenBonds,
        cycleNumber: step.cycleNumber,
        heightAngstrom: step.yAngstrom
      };
      addDynamic(plateMesh1, center1, explode1, 'nucleobase', inspectPlate1);

      const plateGeo2 = new THREE.BoxGeometry(plateLen2, 0.55, 2.35);
      const plateMat2 = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cfg2.colorHex),
        emissive: new THREE.Color(step.isMutated ? '#F43F5E' : cfg2.emissiveHex),
        emissiveIntensity: step.isMutated ? 0.6 : 0.2,
        roughness: 0.25,
        metalness: 0.25
      });
      const plateMesh2 = new THREE.Mesh(plateGeo2, plateMat2);
      plateMesh2.rotation.y = -theta2;

      const inspectPlate2: InspectableSubunit = {
        id: `wc-plate2-${step.stepIndex}`,
        stepIndex: step.stepIndex,
        partType: 'BASE_STRAND_2',
        baseCode: step.strand2Base,
        partnerBaseCode: step.strand1Base,
        strandLabel: "Mạch 2 (3' → 5')",
        titleVi: `Nucleotide ${cfg2.vietnameseName}`,
        chemicalFormula: cfg2.chemicalFormula,
        chemicalGroupVi: cfg2.groupType,
        ntbsRuleVi: cfg2.ntbsSummary,
        hydrogenBondCount: step.hydrogenBonds,
        cycleNumber: step.cycleNumber,
        heightAngstrom: step.yAngstrom
      };
      addDynamic(plateMesh2, center2, explode2, 'nucleobase', inspectPlate2);

      const hCount = step.hydrogenBonds;
      const zOffsets = hCount === 2 ? [-0.55, 0.55] : [-0.72, 0, 0.72];
      const pinGeo = new THREE.CylinderGeometry(0.16, 0.16, gapCenter * 2.4, 12);
      pinGeo.rotateZ(Math.PI / 2);
      const pinMat = new THREE.MeshBasicMaterial({
        color: hCount === 3 ? 0x67e8f9 : 0xfde68a
      });

      const perpZDir = new THREE.Vector3(-Math.sin(theta1), 0, Math.cos(theta1));
      zOffsets.forEach((zOff, idx) => {
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        const pinPos = new THREE.Vector3(0, y, 0).addScaledVector(perpZDir, zOff);
        pinMesh.rotation.y = -theta1;

        const inspectPin: InspectableSubunit = {
          id: `wc-pin-${step.stepIndex}-${idx}`,
          stepIndex: step.stepIndex,
          partType: 'HYDROGEN_BOND',
          baseCode: step.strand1Base,
          partnerBaseCode: step.strand2Base,
          strandLabel: 'Cầu nối / Trục tâm xoắn',
          titleVi: `Liên kết hydrogen (${step.strand1Base} ${hCount === 2 ? '=' : '≡'} ${step.strand2Base})`,
          chemicalFormula:
            hCount === 2 ? 'N–H···O / N···H–N (2 cầu nối)' : 'N–H···O / N–H···N (3 cầu nối)',
          chemicalGroupVi: `Liên kết tĩnh điện yếu (${hCount} liên kết hydrogen)`,
          ntbsRuleVi:
            'Dùng Ngón Cái + Ngón Trỏ (👌) để Zoom sát vào các chốt liên kết hydrogen này, hoặc giơ ngón cái (👍) để tháo xoắn tách đôi 2 mạch.',
          hydrogenBondCount: hCount,
          cycleNumber: step.cycleNumber,
          heightAngstrom: step.yAngstrom
        };
        addDynamic(
          pinMesh,
          pinPos,
          new THREE.Vector3(0, 0, 0),
          'hydrogenBonds',
          inspectPin
        );
      });

      const badge1 = createTextBadgeSprite(
        step.strand1Base,
        cfg1.colorHex,
        '#07090E',
        '#FFFFFF',
        1.95,
        1.0
      );
      addDynamic(
        badge1,
        center1.clone().add(new THREE.Vector3(0, 0.85, 0)),
        explode1,
        'baseLabels3D'
      );

      const badge2 = createTextBadgeSprite(
        step.strand2Base,
        cfg2.colorHex,
        '#07090E',
        '#FFFFFF',
        1.95,
        1.0
      );
      addDynamic(
        badge2,
        center2.clone().add(new THREE.Vector3(0, 0.85, 0)),
        explode2,
        'baseLabels3D'
      );
    });

    if (strand1CurvePoints.length >= 2) {
      const curve1 = new THREE.CatmullRomCurve3(strand1CurvePoints);
      const tube1 = new THREE.Mesh(
        new THREE.TubeGeometry(curve1, strand1CurvePoints.length * 10, 0.48, 16, false),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.25,
          metalness: 0.45
        })
      );
      addDynamic(tube1, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-14, 0, 0), 'backbone');

      const curve2 = new THREE.CatmullRomCurve3(strand2CurvePoints);
      const tube2 = new THREE.Mesh(
        new THREE.TubeGeometry(curve2, strand2CurvePoints.length * 10, 0.48, 16, false),
        new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          roughness: 0.25,
          metalness: 0.45
        })
      );
      addDynamic(tube2, new THREE.Vector3(0, 0, 0), new THREE.Vector3(14, 0, 0), 'backbone');

      const first1 = strand1CurvePoints[0];
      const last1 = strand1CurvePoints[strand1CurvePoints.length - 1];
      const first2 = strand2CurvePoints[0];
      const last2 = strand2CurvePoints[strand2CurvePoints.length - 1];

      const b5_1 = createTextBadgeSprite("Mạch 1: 5'", '#0284C7', '#FFFFFF', '#7DD3FC', 4.2, 1.4);
      addDynamic(
        b5_1,
        first1.clone().add(new THREE.Vector3(0, -2.0, 0)),
        new THREE.Vector3(-14, 0, 0),
        'backbone'
      );

      const b3_1 = createTextBadgeSprite("Đầu 3' ↑", '#0284C7', '#FFFFFF', '#7DD3FC', 3.8, 1.4);
      addDynamic(
        b3_1,
        last1.clone().add(new THREE.Vector3(0, 2.2, 0)),
        new THREE.Vector3(-14, 0, 0),
        'backbone'
      );

      const b3_2 = createTextBadgeSprite("Mạch 2: 3' ↓", '#9333EA', '#FFFFFF', '#E9D5FF', 4.2, 1.4);
      addDynamic(
        b3_2,
        first2.clone().add(new THREE.Vector3(0, -2.0, 0)),
        new THREE.Vector3(14, 0, 0),
        'backbone'
      );

      const b5_2 = createTextBadgeSprite("Đầu 5'", '#9333EA', '#FFFFFF', '#E9D5FF', 3.6, 1.4);
      addDynamic(
        b5_2,
        last2.clone().add(new THREE.Vector3(0, 2.2, 0)),
        new THREE.Vector3(14, 0, 0),
        'backbone'
      );
    }
  }, [activeTab, selectedNucleotideBase, steps]);

  // Apply Camera Orientation Presets
  useEffect(() => {
    const group = dnaGroupRef.current;
    const cam = cameraRef.current;
    if (!group || !cam) return;

    group.position.set(0, 0, 0);
    const defaultZ =
      activeTab === 'NUCLEOTIDE_STRUCTURE'
        ? 42
        : activeTab === 'DNA_VS_MRNA'
        ? 66
        : 56;

    switch (cameraOrientation) {
      case 'FRONT_HELIX':
        group.rotation.set(0, 0, 0);
        cam.position.set(0, 0, defaultZ);
        break;
      case 'TOP_AXIS':
        group.rotation.set(Math.PI / 2, 0, 0);
        cam.position.set(0, 0, defaultZ * 0.85);
        break;
      case 'SINGLE_TURN_34A':
        group.rotation.set(0.08, 0.45, 0);
        cam.position.set(0, 0, defaultZ * 0.9);
        break;
      case 'BASE_PAIR_ZOOM':
        group.rotation.set(0.15, 0.2, 0);
        cam.position.set(0, 0, defaultZ * 0.48);
        break;
      default:
        cam.position.set(0, 0, defaultZ);
        break;
    }
  }, [cameraOrientation, activeTab]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#05070f]">
      {arPassthrough && (
        <video
          ref={arVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-85"
        />
      )}

      {!arPassthrough && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 60% 70% at 50% 45%, rgba(34, 211, 238, 0.14) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(168, 85, 247, 0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 15% 15%, rgba(16, 185, 129, 0.10) 0%, transparent 70%)'
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.35) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)'
            }}
          />
        </>
      )}

      <div ref={containerRef} className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
