import * as THREE from 'three';
import { InspectableSubunit } from '../../types/molecular';
import { BASE_VISUAL_CONFIG } from '../../services/pdbService';
import { SceneBuildContext, createTextBadgeSprite } from './sceneShared';

/** Tab 1: DNA Watson – Crick (1953) */
export function buildWatsonCrickScene(ctx: SceneBuildContext): void {
  const { addDynamic, steps } = ctx;
  // =========================================================================
  // TAB 1 (DEFAULT): MÔ HÌNH DNA ĐƠN GIẢN WATSON & CRICK (1953)
  // =========================================================================
  const radiusHelix = 10.0;
  const bottomY = steps[0]?.yAngstrom ?? -15.3;
  const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;
  const totalHeight = Math.max(10, topY - bottomY + 5);

  if (ctx.gimbal) {
    ctx.gimbal.position.set(0, bottomY - 3.5, 0);
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
  ctx.addRaycastTarget(centralRod);

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
}
