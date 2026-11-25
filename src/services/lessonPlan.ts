import { HandCameraOrientation, ModelTabId, MolecularLayerVisibility, NucleotideCode } from '../types/molecular';

/** Một bước trong chế độ trình chiếu: nội dung giảng + trạng thái mô hình tương ứng */
export interface LessonStep {
  title: string;
  /** Ý chính, hiển thị chữ lớn */
  keyPoint: string;
  /** Lời giảng / câu hỏi gợi mở cho giáo viên */
  body: string;
  /** Câu hỏi nhanh cho học sinh (không bắt buộc) */
  question?: string;
  tab: ModelTabId;
  presetId?: string;
  base?: NucleotideCode;
  explosion: number;
  zoom: number;
  view: { pitch: number; yaw: number; roll: number };
  orientation: HandCameraOrientation;
  autoRotate?: boolean;
  layers?: Partial<MolecularLayerVisibility>;
}

const ALL_LAYERS: MolecularLayerVisibility = {
  backbone: true,
  nucleobase: true,
  hydrogenBonds: true,
  baseLabels3D: true,
  sgkRuler3D: true
};

export const DEFAULT_LAYERS = ALL_LAYERS;

/** Giáo án mẫu: Bài 5 – Các phân tử sinh học, phần Nucleic acid (Sinh học 10, Kết nối tri thức) */
export const NUCLEIC_ACID_LESSON: LessonStep[] = [
  {
    title: 'Mô hình DNA của Watson và Crick',
    keyPoint: 'DNA là chuỗi xoắn kép gồm 2 mạch polynucleotide',
    body: 'Năm 1953, J. Watson và F. Crick công bố mô hình cấu trúc không gian của DNA. Hai mạch xoắn quanh một trục tưởng tượng, giống một chiếc thang dây xoắn.',
    question: 'Theo em, phần “tay vịn” và “bậc thang” của chiếc thang tương ứng với thành phần nào của DNA?',
    tab: 'WATSON_CRICK_DNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1,
    view: { pitch: 8, yaw: -20, roll: 0 },
    orientation: 'FRONT_HELIX',
    autoRotate: true
  },
  {
    title: 'Hai mạch song song, ngược chiều',
    keyPoint: "Mạch 1: 5' → 3' · Mạch 2: 3' → 5'",
    body: "Hai mạch của DNA chạy song song nhưng ngược chiều nhau. Quan sát nhãn đầu 5' và 3' ở hai đầu mỗi mạch.",
    tab: 'WATSON_CRICK_DNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1.2,
    view: { pitch: 18, yaw: 35, roll: -10 },
    orientation: 'SINGLE_TURN_34A',
    layers: { hydrogenBonds: false }
  },
  {
    title: 'Đơn phân của nucleic acid',
    keyPoint: 'Nucleotide = nhóm phosphate + đường pentose + base nitrogen',
    body: "Nhóm phosphate gắn vào carbon C5', base nitrogen gắn vào carbon C1' của đường. DNA có đường deoxyribose; RNA có đường ribose.",
    question: 'DNA có những loại base nitrogen nào? RNA khác DNA ở base nào?',
    tab: 'NUCLEOTIDE_STRUCTURE',
    base: 'A',
    explosion: 0,
    zoom: 1,
    view: { pitch: 10, yaw: 0, roll: 0 },
    orientation: 'FRONT_HELIX'
  },
  {
    title: 'Tách rời 3 thành phần của nucleotide',
    keyPoint: '① Phosphate · ② Đường pentose · ③ Base nitrogen',
    body: 'Tách rời từng thành phần để học sinh gọi tên và chỉ ra vị trí liên kết C1′ và C5′. Có thể đổi sang base T, G, C, U ở góc phải.',
    tab: 'NUCLEOTIDE_STRUCTURE',
    base: 'A',
    explosion: 0.9,
    zoom: 0.95,
    view: { pitch: 10, yaw: 0, roll: 0 },
    orientation: 'FRONT_HELIX'
  },
  {
    title: 'Liên kết phosphodiester trong một mạch',
    keyPoint: 'Các nucleotide trong một mạch nối với nhau bằng liên kết phosphodiester',
    body: 'Liên kết hình thành giữa đường pentose của nucleotide này và nhóm phosphate của nucleotide kế tiếp, tạo nên khung đường – phosphate bền vững ở phía ngoài.',
    tab: 'MOLECULAR_DNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1.4,
    view: { pitch: 12, yaw: 25, roll: 0 },
    orientation: 'BASE_PAIR_ZOOM',
    layers: { hydrogenBonds: false }
  },
  {
    title: 'Nguyên tắc bổ sung',
    keyPoint: 'A = T (2 liên kết hydrogen) · G ≡ C (3 liên kết hydrogen)',
    body: 'Giữa hai mạch, các base liên kết với nhau bằng liên kết hydrogen theo nguyên tắc bổ sung: một base lớn (purine) luôn bắt cặp với một base bé (pyrimidine), nên đường kính DNA không đổi.',
    question: 'Một đoạn DNA có A = 6 cặp, G = 4 cặp. Có bao nhiêu liên kết hydrogen?',
    tab: 'MOLECULAR_DNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1.8,
    view: { pitch: 12, yaw: 18, roll: 0 },
    orientation: 'BASE_PAIR_ZOOM'
  },
  {
    title: 'Kích thước của chuỗi xoắn',
    keyPoint: '1 chu kỳ xoắn = 10 cặp nucleotide = 34 Å · Đường kính 20 Å',
    body: 'Mỗi cặp nucleotide cách nhau 3,4 Å. Nhìn dọc từ trên đỉnh xuống để thấy tiết diện tròn đường kính 20 Å.',
    question: 'Đoạn DNA dài 68 Å có bao nhiêu chu kỳ xoắn và bao nhiêu nucleotide?',
    tab: 'WATSON_CRICK_DNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1,
    view: { pitch: 90, yaw: 0, roll: 0 },
    orientation: 'TOP_AXIS'
  },
  {
    title: 'Liên kết hydrogen kém bền — tách 2 mạch',
    keyPoint: 'Liên kết hydrogen dễ bị cắt đứt khi DNA nhân đôi',
    body: 'Nhờ liên kết hydrogen không bền, hai mạch dễ dàng tách nhau ra để làm khuôn tổng hợp mạch mới, nhưng nhờ có rất nhiều liên kết nên DNA vẫn bền vững.',
    tab: 'WATSON_CRICK_DNA',
    presetId: 'WC_2_TURNS',
    explosion: 0.9,
    zoom: 0.9,
    view: { pitch: 10, yaw: 20, roll: 0 },
    orientation: 'FRONT_HELIX'
  },
  {
    title: 'Thay thế một cặp nucleotide',
    keyPoint: 'Thay cặp A = T bằng G ≡ C: chiều dài không đổi, H tăng thêm 1',
    body: 'Cặp số 5 đã được thay thế. So sánh số liên kết hydrogen ở bảng thông số với mẫu chuẩn.',
    tab: 'WATSON_CRICK_DNA',
    presetId: 'WC_POINT_MUTATION',
    explosion: 0,
    zoom: 1.3,
    view: { pitch: 10, yaw: -15, roll: 0 },
    orientation: 'FRONT_HELIX'
  },
  {
    title: 'So sánh DNA và RNA',
    keyPoint: 'RNA: 1 mạch · đường ribose · có U thay cho T',
    body: 'Đặt cạnh nhau hai mạch DNA và mạch mRNA được phiên mã. Trình tự mRNA giống mạch bổ sung với mạch khuôn, chỉ thay T bằng U.',
    question: 'Nêu 3 điểm khác nhau giữa DNA và RNA về cấu tạo.',
    tab: 'DNA_VS_MRNA',
    presetId: 'WC_1_TURN',
    explosion: 0,
    zoom: 1,
    view: { pitch: 8, yaw: 0, roll: 0 },
    orientation: 'FRONT_HELIX'
  }
].map((s) => ({ ...s, layers: { ...ALL_LAYERS, ...(s.layers || {}) } })) as LessonStep[];
