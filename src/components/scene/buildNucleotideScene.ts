import * as THREE from 'three';
import { InspectableSubunit } from '../../types/molecular';
import { BASE_VISUAL_CONFIG } from '../../services/pdbService';
import { SceneBuildContext, createTextBadgeSprite, createBondCylinder } from './sceneShared';

/** Tab 3: Cấu trúc đơn phân nucleotide */
export function buildNucleotideScene(ctx: SceneBuildContext): void {
  const { addDynamic, selectedNucleotideBase } = ctx;
  if (ctx.gimbal) {
    ctx.gimbal.position.set(0, -13, 0);
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

}
