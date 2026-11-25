import {
  BasePairStep,
  HighSchoolDNAStats,
  HighSchoolLessonPreset,
  NucleotideCode,
  BioInteractionIdea,
  ModelTabId
} from '../types/molecular';

export const COMPLEMENT_BASE: Record<NucleotideCode, NucleotideCode> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  U: 'A'
};

export const MODEL_TABS: {
  id: ModelTabId;
  shortTitle: string;
  fullTitle: string;
  badge: string;
  summary: string;
}[] = [
  {
    id: 'WATSON_CRICK_DNA',
    shortTitle: '1. DNA Đơn Giản (Watson-Crick)',
    fullTitle: 'Mô Hình DNA Xoắn Kép Đơn Giản Theo Watson & Crick (1953)',
    badge: 'Chuẩn 1953',
    summary:
      'Gồm trục tâm kim loại, đế cầm tay, 2 dải băng xoắn ngược chiều (5\'→3\' và 3\'→5\') và các bậc thang bản phẳng A=T, G≡C.'
  },
  {
    id: 'MOLECULAR_DNA',
    shortTitle: '2. DNA Dạng Phân Tử (Nguyên Tử)',
    fullTitle: 'Mô Hình DNA Ở Dạng Phân Tử & Liên Kết Hóa Trị (Ball-and-Stick 3D)',
    badge: 'Cấu trúc phân tử',
    summary:
      'Hiển thị rõ từng cụm nguyên tử Photphat (-PO₄³⁻), vòng 5 cạnh Đường Deoxyribose (C₅H₁₀O₄) và vòng thơm Purin (2 vòng) / Pirimiđin (1 vòng).'
  },
  {
    id: 'NUCLEOTIDE_STRUCTURE',
    shortTitle: '3. Cấu Trúc Đơn Phân Nucleotide',
    fullTitle: 'Giải Phẫu 3D Cấu Trúc Hóa Học Của 1 Đơn Phân Nucleotide',
    badge: '3 thành phần cấu tạo',
    summary:
      'Khảo sát chi tiết 3 tiểu phần cấu tạo nên 1 Nucleotide: (1) Nhóm Photphat ở C5\', (2) Đường Pentozơ 5 Carbon (C1\'→C5\') và (3) Bazơ Nitơ (A, T, G, C, U) ở C1\'.'
  },
  {
    id: 'DNA_VS_MRNA',
    shortTitle: '4. So Sánh 2 Mô Hình DNA & mRNA',
    fullTitle: 'Đặt Cạnh Nhau 2 Mô Hình 3D: Chuỗi Xoắn Kép DNA & Mạch Đơn mRNA Phiên Mã',
    badge: 'Đối chiếu trực quan',
    summary:
      'So sánh song song trong không gian 3D giữa DNA (2 mạch xoắn kép, đường Deoxyribose, có Thymine - T) và mRNA (1 mạch đơn, đường Ribose, thay T bằng Uracil - U).'
  }
];

export const BASE_VISUAL_CONFIG: Record<
  NucleotideCode,
  {
    code: NucleotideCode;
    vietnameseName: string;
    englishName: string;
    chemicalFormula: string;
    nucleotideFormula: string;
    molarMass: string;
    groupType: 'Purin (Kích thước lớn - 2 vòng)' | 'Pirimiđin (Kích thước bé - 1 vòng)';
    colorHex: string;
    emissiveHex: string;
    barLengthRatio: number;
    hBonds: 0 | 2 | 3;
    partnerCode: NucleotideCode;
    ntbsSummary: string;
  }
> = {
  A: {
    code: 'A',
    vietnameseName: 'Adenine (Ađênin - A)',
    englishName: 'Adenine',
    chemicalFormula: 'C₅H₅N₅ (Bazơ) · C₁₀H₁₄N₅O₆P (dAMP)',
    nucleotideFormula: 'C₅H₅N₅',
    molarMass: '135,13 g/mol',
    groupType: 'Purin (Kích thước lớn - 2 vòng)',
    colorHex: '#10B981', // Emerald Green
    emissiveHex: '#065F46',
    barLengthRatio: 0.56,
    hBonds: 2,
    partnerCode: 'T',
    ntbsSummary:
      'Adenine (A - cấu trúc 2 vòng Purin gồm vòng 6 cạnh ghép vòng 5 cạnh) bắt cặp bổ sung với Thymine (T) trên DNA hoặc Uracil (U) trên mRNA bằng 2 liên kết Hydro.'
  },
  T: {
    code: 'T',
    vietnameseName: 'Thymine (Timin - T)',
    englishName: 'Thymine',
    chemicalFormula: 'C₅H₆N₂O₂ (Bazơ) · C₁₀H₁₅N₂O₈P (dTMP)',
    nucleotideFormula: 'C₅H₆N₂O₂',
    molarMass: '126,11 g/mol',
    groupType: 'Pirimiđin (Kích thước bé - 1 vòng)',
    colorHex: '#F59E0B', // Golden Amber
    emissiveHex: '#78350F',
    barLengthRatio: 0.44,
    hBonds: 2,
    partnerCode: 'A',
    ntbsSummary:
      'Thymine (T - vòng đơn 6 cạnh Pirimiđin có gắn nhóm metyl -CH₃ ở C5, chỉ có ở DNA) luôn bắt cặp với Adenine (A) qua 2 liên kết Hydro (T = A).'
  },
  G: {
    code: 'G',
    vietnameseName: 'Guanine (Guanin - G)',
    englishName: 'Guanine',
    chemicalFormula: 'C₅H₅N₅O (Bazơ) · C₁₀H₁₄N₅O₇P (dGMP)',
    nucleotideFormula: 'C₅H₅N₅O',
    molarMass: '151,13 g/mol',
    groupType: 'Purin (Kích thước lớn - 2 vòng)',
    colorHex: '#06B6D4', // Vibrant Cyan
    emissiveHex: '#155E75',
    barLengthRatio: 0.56,
    hBonds: 3,
    partnerCode: 'C',
    ntbsSummary:
      'Guanine (G - cấu trúc 2 vòng Purin có nhóm =O ở C6 và -NH₂ ở C2) luôn bắt cặp bổ sung với Cytosine (C) qua 3 liên kết Hydro bền vững (G ≡ C).'
  },
  C: {
    code: 'C',
    vietnameseName: 'Cytosine (Xitôzin - C)',
    englishName: 'Cytosine',
    chemicalFormula: 'C₄H₅N₃O (Bazơ) · C₉H₁₄N₃O₇P (dCMP)',
    nucleotideFormula: 'C₄H₅N₃O',
    molarMass: '111,10 g/mol',
    groupType: 'Pirimiđin (Kích thước bé - 1 vòng)',
    colorHex: '#F43F5E', // Coral Rose
    emissiveHex: '#881337',
    barLengthRatio: 0.44,
    hBonds: 3,
    partnerCode: 'G',
    ntbsSummary:
      'Cytosine (C - vòng đơn 6 cạnh Pirimiđin có ở cả DNA và mRNA) luôn bắt cặp bổ sung với Guanine (G) qua 3 liên kết Hydro bền vững (C ≡ G).'
  },
  U: {
    code: 'U',
    vietnameseName: 'Uracil (Uraxin - U · Đặc trưng mRNA)',
    englishName: 'Uracil',
    chemicalFormula: 'C₄H₄N₂O₂ (Bazơ) · C₉H₁₃N₂O₉P (UMP)',
    nucleotideFormula: 'C₄H₄N₂O₂',
    molarMass: '112,09 g/mol',
    groupType: 'Pirimiđin (Kích thước bé - 1 vòng)',
    colorHex: '#A855F7', // Vibrant Violet for Uracil
    emissiveHex: '#581C87',
    barLengthRatio: 0.44,
    hBonds: 2,
    partnerCode: 'A',
    ntbsSummary:
      'Uracil (U - vòng đơn 6 cạnh Pirimiđin thay thế cho Thymine trên phân tử mRNA, không có nhóm -CH₃ ở C5) bắt cặp bổ sung với Adenine (A) của mạch khuôn DNA trong quá trình phiên mã.'
  }
};

export const DNA_VS_MRNA_COMPARISON_ROWS = [
  {
    criterion: '1. Số mạch polinucleotide',
    dnaValue: '2 mạch xoắn kép song song ngược chiều (5\'→3\' và 3\'→5\')',
    mrnaValue: '1 mạch đơn duy nhất có chiều 5\' → 3\''
  },
  {
    criterion: '2. Đường Pentozơ (5C)',
    dnaValue: 'Đường Deoxyribose (C₅H₁₀O₄ — thiếu 1 nguyên tử Oxy ở C2\')',
    mrnaValue: 'Đường Ribose (C₅H₁₀O₅ — có nhóm -OH tự do ở C2\')'
  },
  {
    criterion: '3. 4 loại Bazơ Nitơ',
    dnaValue: 'Adenine (A), Thymine (T), Guanine (G), Cytosine (C)',
    mrnaValue: 'Adenine (A), Uracil (U - thay cho T), Guanine (G), Cytosine (C)'
  },
  {
    criterion: '4. Liên kết Hydro ngang',
    dnaValue: 'Có hệ thống liên kết Hydro bền vững (A = T, G ≡ C)',
    mrnaValue: 'Mạch đơn thẳng nên không có liên kết Hydro giữa 2 mạch'
  },
  {
    criterion: '5. Kích thước & Độ bền',
    dnaValue: 'Đường kính 20 Å, rất lớn và bền vững trong nhân tế bào',
    mrnaValue: 'Đường kính ~10 Å, ngắn hơn, dễ bị phân hủy sau khi dịch mã'
  }
];

export const HIGH_SCHOOL_PRESETS: HighSchoolLessonPreset[] = [
  {
    id: 'WC_1_TURN',
    title: '1. Chuẩn 1 Chu Kỳ Xoắn (10 cặp Base = 34 Å)',
    badge: '10 cặp = 34 Å',
    sequenceStrand1: 'ATGCATGCAT',
    description:
      'Đoạn gen chuẩn gồm 10 cặp nucleotide (20 nu) tương ứng với đúng 1 chu kỳ xoắn hoàn chỉnh cao 34 Å, đường kính 20 Å.',
    keyTakeaway:
      '1 chu kỳ xoắn = 10 cặp nucleotide (20 nu) = cao 34 Å · Mỗi bậc cách nhau 3,4 Å và xoay lệch 36° · Đường kính 20 Å.'
  },
  {
    id: 'WC_2_TURNS',
    title: '2. Đoạn DNA 2 Chu Kỳ Xoắn (20 cặp Base = 68 Å)',
    badge: '20 cặp = 68 Å',
    sequenceStrand1: 'ATGCGGCCAATTGGCCATGC',
    description:
      'Kéo dài mô hình lên 20 bậc thang (40 nucleotide) tương ứng với 2 chu kỳ xoắn hoàn chỉnh (chiều dài L = 68 Å).',
    keyTakeaway:
      'Khi số chu kỳ xoắn C = 2 → Tổng số nu N = 20 × C = 40 nu; Chiều dài L = (N/2) × 3,4 = 68 Å.'
  },
  {
    id: 'WC_POINT_MUTATION',
    title: '3. Đột Biến Điểm Thay Thế Cặp A = T Bằng Cặp G ≡ C',
    badge: 'Đột biến bậc #5',
    sequenceStrand1: 'ATGCGCGCAT',
    description:
      'So với mẫu chuẩn, bậc thang số 5 được thay thế từ cặp A=T (2 liên kết Hydro) sang cặp G≡C (3 liên kết Hydro). Chiều dài 34 Å không đổi nhưng tổng số liên kết Hydro tăng thêm!',
    keyTakeaway:
      'Thay thế 1 cặp A-T bằng 1 cặp G-C: Chiều dài DNA giữ nguyên, tổng số liên kết Hydro (H = 2A + 3G) tăng thêm 1.'
  }
];

export const HIGH_SCHOOL_GESTURE_IDEAS: BioInteractionIdea[] = [
  {
    id: 'gesture-palm-3d',
    title: '✋ 1. Xòe Bàn Tay (Palm 3D Orientation — Đồng Bộ Góc Nghiêng)',
    subtitle: 'Nghiêng cổ tay (Roll Z), Úp/ngửa bàn tay (Pitch X), Xoay lòng bàn tay 360° (Yaw Y)',
    gestureIcon: '✋',
    gestureTrigger: 'Xòe mở bàn tay trước Camera',
    highSchoolTopic: 'Cảm giác cầm trực tiếp chuỗi DNA / Nucleotide trên tay',
    scientificApplication:
      'Đồng bộ 1:1 ma trận góc nghiêng 3 chiều của lòng bàn tay với trục mô hình: Nghiêng cổ tay trái/phải nghiêng trục Z, úp/ngửa bàn tay chúc/ngửa trục X, xoay lòng bàn tay xoay tròn 360° trục Y.',
    presetId: 'WC_1_TURN',
    targetTab: 'WATSON_CRICK_DNA',
    demoAction: 'PALM_ORIENTATION'
  },
  {
    id: 'gesture-pinch-zoom',
    title: '👌 2. Ngón Cái + Ngón Trỏ (Zoom Ra / Zoom Vào Độc Lập Khoảng Cách Bàn Tay)',
    subtitle: 'Mở rộng Ngón Cái & Ngón Trỏ để Phóng To — Chụm sát 2 ngón để Thu Nhỏ',
    gestureIcon: '👌',
    gestureTrigger: 'Dùng Ngón Cái + Ngón Trỏ mở ra / khép lại (không phụ thuộc cự ly bàn tay)',
    highSchoolTopic: 'Phóng to vào sát liên kết Hydro & vòng phân tử Đường - Photphat',
    scientificApplication:
      'Hệ thống chuẩn hóa tỷ lệ khoảng cách giữa đầu Ngón Cái (#4) và đầu Ngón Trỏ (#8) theo kích thước lòng bàn tay, giúp bạn Zoom ra/vào mượt mà mà không bị nhảy hình khi đưa tay gần hay xa camera.',
    presetId: 'WC_1_TURN',
    targetTab: 'MOLECULAR_DNA',
    demoAction: 'PINCH_ZOOM_HBONDS'
  },
  {
    id: 'gesture-thumbs-up',
    title: '👍 3. Giơ Ngón Tay Cái (Thumbs-Up — Tháo Xoắn DNA & Tách 3 Phần Nucleotide)',
    subtitle: 'Tách đôi 2 mạch đơn DNA hoặc bóc tách 3 tiểu phần cấu tạo của Nucleotide',
    gestureIcon: '👍',
    gestureTrigger: 'Nắm 4 ngón và giơ ngón tay cái hướng lên (Thumbs-up)',
    highSchoolTopic: 'Mô phỏng quá trình tự nhân đôi DNA & giải phẫu đơn phân Nucleotide',
    scientificApplication:
      'Ở tab DNA, ngón cái (👍) cắt đứt liên kết Hydro tách 2 mạch đơn. Ở tab Cấu trúc Nucleotide, ngón cái (👍) tách rời Nhóm Photphat (-PO₄³⁻), Đường Pentozơ (5C) và Bazơ Nitơ để thấy rõ các vị trí liên kết C1\' và C5\'.',
    presetId: 'WC_1_TURN',
    targetTab: 'NUCLEOTIDE_STRUCTURE',
    demoAction: 'THUMBS_UP_UNZIP'
  },
  {
    id: 'gesture-peace-top',
    title: '✌️ 4. Giơ 2 Ngón Tay Chữ V (Peace Sign — Nhìn Từ Đỉnh Xuống)',
    subtitle: 'Tự động chuyển ngay sang Góc nhìn từ trên đỉnh xuống (Top-down view)',
    gestureIcon: '✌️',
    gestureTrigger: 'Giơ 2 ngón trỏ và ngón giữa tạo hình chữ V',
    highSchoolTopic: 'Quan sát tiết diện hình trụ tròn 20 Å & đối xứng tâm',
    scientificApplication:
      'Giúp nhìn rõ hình trụ tròn đường kính 20 Å của trục xoắn kép DNA (so với bán kính mạch đơn 10 Å của mRNA) và vị trí các cặp base A=T, G≡C xếp đối xứng qua trục tâm.',
    presetId: 'WC_1_TURN',
    targetTab: 'DNA_VS_MRNA',
    demoAction: 'PEACE_TOP_DOWN'
  },
  {
    id: 'gesture-fist-inertia',
    title: '✊ 5. Nắm Bàn Tay Lại (Fist / Grab — Xoay Tự Do Theo Quán Tính)',
    subtitle: 'Nắm tay kéo rê trong không gian để tạo đà xoay chuỗi DNA theo quán tính vật lý',
    gestureIcon: '✊',
    gestureTrigger: 'Nắm chặt bàn tay (✊) và vẩy/kéo rê theo hướng muốn xoay',
    highSchoolTopic: 'Tương tác vật lý tự nhiên trên cả 4 tab mô hình 3D',
    scientificApplication:
      'Truyền vận tốc góc (Angular Momentum) cho mô hình. Khi dừng tay hoặc thả tay, mô hình DNA / Nucleotide / mRNA tiếp tục quay mượt mà theo đà quán tính.',
    presetId: 'WC_1_TURN',
    targetTab: 'MOLECULAR_DNA',
    demoAction: 'FIST_INERTIA'
  },
  {
    id: 'gesture-point-inspect',
    title: '👉 6. Chỉ 1 Ngón Trỏ (Point & Inspect — Thẻ Thông Số A, T, G, C, U)',
    subtitle: 'Rà đầu ngón trỏ vào bất kỳ nucleotide hay nhóm nguyên tử nào để xem công thức hóa học',
    gestureIcon: '👉',
    gestureTrigger: 'Duỗi 1 ngón trỏ (👉, khép ngón cái) chỉ vào chi tiết trên mô hình',
    highSchoolTopic: 'Tra cứu tức thì công thức phân tử (A, T, G, C, Uracil, Deoxyribose, Ribose)',
    scientificApplication:
      'Tia định vị từ đầu ngón trỏ bắt dính vào từng nguyên tử/bậc thang trên cả 4 tab, hiển thị thẻ thông số công thức hóa học, phân nhóm Purin/Pirimiđin và liên kết Hydro.',
    presetId: 'WC_1_TURN',
    targetTab: 'DNA_VS_MRNA',
    demoAction: 'POINT_INSPECT_DEMO'
  }
];

export function normalizeHighSchoolSequence(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/X/g, 'C')
    .replace(/U/g, 'T')
    .replace(/[^ATGC]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 30) : 'ATGCATGCAT';
}

export function buildHighSchoolDNAModel(
  rawSequence1: string,
  mutatedStepIndex: number | null = null
): {
  steps: BasePairStep[];
  stats: HighSchoolDNAStats;
} {
  const seq1 = normalizeHighSchoolSequence(rawSequence1);
  const steps: BasePairStep[] = [];

  let countA = 0;
  let countG = 0;
  let countMrnaU = 0;
  let seq2 = '';
  let seqMrna = '';

  const totalPairs = seq1.length;
  const risePerStep = 3.4;
  const twistPerStepRad = (36 * Math.PI) / 180;
  const halfHeight = ((totalPairs - 1) * risePerStep) / 2;

  for (let i = 0; i < totalPairs; i++) {
    const base1 = seq1[i] as NucleotideCode;
    const base2 = COMPLEMENT_BASE[base1];
    // Mạch 2 (3' -> 5') đóng vai trò mạch khuôn (template strand) để phiên mã ra mRNA (5' -> 3'):
    // Do đó trình tự mRNA (5' -> 3') bổ sung với Mạch 2 và giống Mạch 1 nhưng thay T bằng U!
    const mrnaBase: NucleotideCode = base1 === 'T' ? 'U' : base1;

    seq2 += base2;
    seqMrna += mrnaBase;

    if (mrnaBase === 'U') {
      countMrnaU += 1;
    }

    if (base1 === 'A' || base2 === 'A') {
      countA += 1;
    } else {
      countG += 1;
    }

    const hBonds: 2 | 3 = base1 === 'A' || base1 === 'T' ? 2 : 3;

    steps.push({
      stepIndex: i + 1,
      cycleNumber: Math.floor(i / 10) + 1,
      strand1Base: base1,
      strand2Base: base2,
      mrnaBase,
      hydrogenBonds: hBonds,
      yAngstrom: Number((i * risePerStep - halfHeight).toFixed(2)),
      twistAngleRad: i * twistPerStepRad,
      isMutated: mutatedStepIndex === i + 1
    });
  }

  const totalNucleotides = totalPairs * 2;
  const lengthAngstrom = Number((totalPairs * 3.4).toFixed(1));
  const lengthNanometer = Number((lengthAngstrom / 10).toFixed(2));
  const hydrogenBondsTotal = 2 * countA + 3 * countG;
  const covalentBondsTotal = 2 * totalNucleotides - 2;
  const helicalTurns = Number((totalNucleotides / 20).toFixed(2));
  const molecularMassDvc = totalNucleotides * 300;

  const percentAT = Number(((countA / Math.max(1, totalNucleotides)) * 100).toFixed(1));
  const percentGC = Number(((countG / Math.max(1, totalNucleotides)) * 100).toFixed(1));

  return {
    steps,
    stats: {
      sequenceStrand1: seq1,
      sequenceStrand2: seq2,
      sequenceMrna: seqMrna,
      totalPairs,
      totalNucleotides,
      countA,
      countT: countA,
      countG,
      countC: countG,
      countMrnaU,
      percentAT,
      percentGC,
      lengthAngstrom,
      lengthNanometer,
      hydrogenBondsTotal,
      covalentBondsTotal,
      helicalTurns,
      molecularMassDvc
    }
  };
}
