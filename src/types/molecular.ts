export type NucleotideCode = 'A' | 'T' | 'G' | 'C' | 'U';

export type ModelTabId =
  | 'WATSON_CRICK_DNA'
  | 'MOLECULAR_DNA'
  | 'NUCLEOTIDE_STRUCTURE'
  | 'DNA_VS_MRNA';

export interface BasePairStep {
  stepIndex: number; // 1-based index (1 to 10 for 1 helical turn)
  cycleNumber: number; // Chu kỳ xoắn (10 pairs per turn)
  strand1Base: NucleotideCode; // Mạch 1 (5' -> 3')
  strand2Base: NucleotideCode; // Mạch 2 bổ sung / Mạch gốc (3' -> 5')
  mrnaBase: NucleotideCode; // Mạch mRNA phiên mã (5' -> 3', thay T bằng U)
  hydrogenBonds: 2 | 3; // A=T has 2, G≡C has 3
  yAngstrom: number; // Vertical height along axis (3.4 Å per step)
  twistAngleRad: number; // 36° (0.628 rad) per step
  isMutated?: boolean;
}

export interface InspectableSubunit {
  id: string;
  stepIndex: number;
  partType:
    | 'BASE_STRAND_1'
    | 'BASE_STRAND_2'
    | 'SUGAR_PHOSPHATE_1'
    | 'SUGAR_PHOSPHATE_2'
    | 'HYDROGEN_BOND'
    | 'CENTRAL_AXIS'
    | 'PHOSPHATE_GROUP'
    | 'DEOXYRIBOSE_SUGAR'
    | 'RIBOSE_SUGAR'
    | 'GLYCOSIDIC_BOND'
    | 'PHOSPHODIESTER_BOND'
    | 'MRNA_BACKBONE'
    | 'MRNA_BASE';
  baseCode: NucleotideCode;
  partnerBaseCode: NucleotideCode;
  strandLabel:
    | "Mạch 1 (5' → 3')"
    | "Mạch 2 (3' → 5')"
    | "Mạch đơn mRNA (5' → 3')"
    | 'Cầu nối / Trục tâm xoắn'
    | 'Cấu tạo đơn phân Nucleotide';
  titleVi: string;
  chemicalFormula: string;
  chemicalGroupVi: string;
  ntbsRuleVi: string;
  hydrogenBondCount: 0 | 2 | 3;
  cycleNumber: number;
  heightAngstrom: number;
}

export interface HoveredSubunitInfo {
  subunit: InspectableSubunit;
  screenX: number;
  screenY: number;
}

export interface HighSchoolDNAStats {
  sequenceStrand1: string;
  sequenceStrand2: string;
  sequenceMrna: string;
  totalPairs: number; // N / 2
  totalNucleotides: number; // N = 2A + 2G
  countA: number;
  countT: number;
  countG: number;
  countC: number;
  countMrnaU: number;
  percentAT: number;
  percentGC: number;
  lengthAngstrom: number; // L = (N/2) * 3.4
  lengthNanometer: number; // L_nm = L / 10
  hydrogenBondsTotal: number; // H = 2A + 3G
  covalentBondsTotal: number; // HT = 2N - 2
  helicalTurns: number; // C = N / 20
  molecularMassDvc: number; // M = N * 300 đvC
}

export interface HighSchoolLessonPreset {
  id: string;
  title: string;
  badge: string;
  sequenceStrand1: string;
  description: string;
  keyTakeaway: string;
}

export type MolecularLayerVisibility = {
  backbone: boolean; // Khung xương Đường - Photphat (5'->3' & 3'->5')
  nucleobase: boolean; // Các bazơ nitơ (A, T, G, C, U)
  hydrogenBonds: boolean; // Liên kết Hydro (2 chấu A=T, 3 chấu G≡C)
  baseLabels3D: boolean; // Nhãn chữ A, T, G, C, U và ký hiệu nguyên tử 3D
  sgkRuler3D: boolean; // Trục tâm, Đế cầm & Thước đo kích thước 3D
};

export type HandCameraOrientation =
  | 'FREE_3D'
  | 'FRONT_HELIX'
  | 'TOP_AXIS'
  | 'SINGLE_TURN_34A'
  | 'BASE_PAIR_ZOOM';

export type ActiveGestureType =
  | 'IDLE'
  | 'PALM_3D_ORIENTATION' // ✋ Xòe bàn tay: Đồng bộ góc nghiêng Roll, Pitch, Yaw
  | 'PEACE_TOP_VIEW' // ✌️ Giơ 2 ngón chữ V: Nhìn từ đỉnh xuống (Top-down view)
  | 'THUMBS_UP_UNZIP' // 👍 Giơ ngón tay cái: Tháo xoắn / Tách đôi 2 mạch đơn (hoặc tách 3 phần Nucleotide)
  | 'PINCH_ZOOM' // 👌 Khoảng cách Ngón cái + Ngón trỏ: Zoom ra / Zoom vào (không phụ thuộc khoảng cách bàn tay)
  | 'FIST_INERTIA_GRAB' // ✊ Nắm bàn tay lại: Kéo rê xoay tự do theo quán tính
  | 'POINT_INSPECT'; // 👉 Chỉ 1 ngón trỏ: Hiển thị thẻ thông số A,T,G,C,U & công thức hóa học

export interface HandTelemetryState {
  handsDetected: number;
  primaryGesture: ActiveGestureType;
  gestureConfidence: number;
  indexTipScreen: { x: number; y: number } | null;
  thumbTipScreen: { x: number; y: number } | null;
  pinchDistance: number; // Khoảng cách tương đối giữa Ngón cái & Ngón trỏ (đã chuẩn hóa)
  zoomLevelNormalized: number; // 0.5x to 2.5x
  handRollDeg: number; // Nghiêng cổ tay trái/phải (Trục Z)
  handPitchDeg: number; // Úp/ngửa bàn tay (Trục X)
  handYawDeg: number; // Xoay lòng bàn tay 360° (Trục Y)
  inertiaSpeed: number; // Tốc độ quán tính khi nắm tay kéo rê
}

export interface BioInteractionIdea {
  id: string;
  title: string;
  subtitle: string;
  gestureIcon: string;
  gestureTrigger: string;
  highSchoolTopic: string;
  scientificApplication: string;
  presetId: string;
  targetTab?: ModelTabId;
  demoAction:
    | 'PALM_ORIENTATION'
    | 'PEACE_TOP_DOWN'
    | 'THUMBS_UP_UNZIP'
    | 'PINCH_ZOOM_HBONDS'
    | 'FIST_INERTIA'
    | 'POINT_INSPECT_DEMO';
}
