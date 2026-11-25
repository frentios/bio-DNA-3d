import * as THREE from 'three';
import { InspectableSubunit } from '../../types/molecular';
import { BASE_VISUAL_CONFIG } from '../../services/pdbService';
import { SceneBuildContext, createTextBadgeSprite } from './sceneShared';

/** Tab 4: So sánh DNA và mRNA */
export function buildDnaVsMrnaScene(ctx: SceneBuildContext): void {
  const { addDynamic, steps } = ctx;
  const bottomY = steps[0]?.yAngstrom ?? -15.3;
  const topY = steps[steps.length - 1]?.yAngstrom ?? 15.3;
  if (ctx.gimbal) {
    ctx.gimbal.position.set(0, bottomY - 4.0, 0);
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

}
