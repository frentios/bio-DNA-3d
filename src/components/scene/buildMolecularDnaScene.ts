import * as THREE from 'three';
import { InspectableSubunit, NucleotideCode } from '../../types/molecular';
import { BASE_VISUAL_CONFIG } from '../../services/pdbService';
import { SceneBuildContext, createTextBadgeSprite, createBondCylinder } from './sceneShared';

/** Tab 2: DNA dạng phân tử (quả cầu – que) */
export function buildMolecularDnaScene(ctx: SceneBuildContext): void {
  const { addDynamic, steps } = ctx;
  const radiusHelix = 10.2;
  const bottomY = steps[0]?.yAngstrom ?? -15.3;
  const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;

  if (ctx.gimbal) {
    ctx.gimbal.position.set(0, bottomY - 3.8, 0);
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

}
