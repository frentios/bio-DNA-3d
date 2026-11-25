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
import {
  DynamicMeshRecord,
  SceneBuildContext

} from './scene/sceneShared';
import { buildNucleotideScene } from './scene/buildNucleotideScene';
import { buildDnaVsMrnaScene } from './scene/buildDnaVsMrnaScene';
import { buildMolecularDnaScene } from './scene/buildMolecularDnaScene';
import { buildWatsonCrickScene } from './scene/buildWatsonCrickScene';

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
  /** Chế độ hologram kiểu JARVIS */
  hologram?: boolean;
  onSubunitHover: (info: HoveredSubunitInfo | null) => void;
  onSubunitSelect: (subunit: InspectableSubunit) => void;
  onManualRotationChange?: (deg: { pitch: number; yaw: number; roll: number }) => void;
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
  hologram = false,
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

    const ctx: SceneBuildContext = {
      steps,
      selectedNucleotideBase,
      gimbal: wristGimbalRingRef.current,
      addRaycastTarget: (obj) => raycastTargetsRef.current.push(obj),
      addDynamic
    };

    if (activeTab === 'NUCLEOTIDE_STRUCTURE') buildNucleotideScene(ctx);
    else if (activeTab === 'DNA_VS_MRNA') buildDnaVsMrnaScene(ctx);
    else if (activeTab === 'MOLECULAR_DNA') buildMolecularDnaScene(ctx);
    else buildWatsonCrickScene(ctx);
  }, [activeTab, selectedNucleotideBase, steps]);

  // ✨ Chế độ hologram: đổi vật liệu sang ánh sáng cyan bán trong suốt (giữ lại vật liệu gốc để khôi phục)
  useEffect(() => {
    const group = dnaGroupRef.current;
    if (!group) return;
    const holoBase = new THREE.Color(0x00e5ff);
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || obj === highlightRingRef.current) return;
      if (hologram) {
        if (!mesh.userData.origMaterial) {
          mesh.userData.origMaterial = mesh.material;
          const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const color =
            (src as THREE.MeshStandardMaterial).color?.clone().lerp(holoBase, 0.3) ?? holoBase.clone();
          mesh.material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.7,
            blending: THREE.NormalBlending,
            depthWrite: false
          });
        }
      } else if (mesh.userData.origMaterial) {
        (mesh.material as THREE.Material).dispose();
        mesh.material = mesh.userData.origMaterial;
        delete mesh.userData.origMaterial;
      }
    });
  }, [hologram, activeTab, selectedNucleotideBase, steps]);

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
