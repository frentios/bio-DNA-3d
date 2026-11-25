# BioMotion 3D 🧬

Mô hình **DNA 3D tương tác** cho môn Sinh học lớp 10 (bộ sách *Kết nối tri thức với cuộc sống*, Bài 5 – Các phân tử sinh học).
Học sinh có thể **xoay, phóng to, tách mạch và tra cứu** từng nucleotide bằng **cử chỉ bàn tay trước webcam**, hoặc bằng chuột và thanh trượt.

## Bốn mô hình 3D

| Mô hình | Nội dung |
|---|---|
| **DNA Watson – Crick** | Chuỗi xoắn kép theo mô hình năm 1953: 2 mạch ngược chiều (5'→3' và 3'→5'), cặp A = T và G ≡ C, đường kính 20 Å, mỗi chu kỳ xoắn 34 Å |
| **DNA dạng phân tử** | Mô hình nguyên tử dạng quả cầu – que: nhóm phosphate, đường deoxyribose, base purine / pyrimidine |
| **Cấu trúc nucleotide** | Ba thành phần của một nucleotide: nhóm phosphate (C5'), đường pentose, base nitrogen (C1'), có đủ A, T, G, C, U |
| **So sánh DNA và mRNA** | Đặt cạnh nhau hai mạch DNA và mạch mRNA được phiên mã (T thay bằng U), kèm bảng so sánh |

Ứng dụng tự tính các đại lượng của đoạn DNA: tổng số nucleotide **N**, chiều dài **L = N/2 × 3,4 Å**, số liên kết hydrogen **H = 2A + 3G**, số chu kỳ xoắn **C = N/20**, khối lượng **M = N × 300 amu**. Bạn có thể tự nhập trình tự mạch 1, hoặc bấm vào từng cặp nucleotide để tạo đột biến thay thế.

## Sáu cử chỉ bàn tay

| Cử chỉ | Tác dụng |
|---|---|
| ✋ Xoè tay | Xoay mô hình theo góc nghiêng của lòng bàn tay (Roll / Pitch / Yaw) |
| 👌 Chụm ngón cái + ngón trỏ rồi mở / khép | Phóng to / thu nhỏ (không phụ thuộc khoảng cách từ tay tới camera) |
| ✌️ Chữ V | Nhìn từ đỉnh, dọc theo trục xoắn |
| 👍 Giơ ngón cái | Tháo xoắn, tách 2 mạch đơn; ở mô hình nucleotide thì tách rời 3 thành phần |
| ✊ Nắm tay và kéo | Xoay tự do theo quán tính |
| 👉 Chỉ ngón trỏ | Trỏ vào một chi tiết để xem công thức và số liên kết hydrogen |

Nhận dạng cử chỉ dùng [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) và chạy hoàn toàn trên trình duyệt, không gửi hình ảnh đi đâu. Thuật toán:
- chỉ chấp nhận cử chỉ khi tay giữ ổn định vài khung hình, để tránh nhấp nháy;
- làm mượt góc xoay bằng bộ lọc One-Euro;
- dùng được cho cả tay trái lẫn tay phải.

Nếu không có camera, có thể dùng **chuột** (kéo để xoay, cuộn để phóng to, bấm vào chi tiết để chọn), các **thanh trượt** và các **nút mô phỏng cử chỉ**.

## Chạy trên máy

Cần **Node.js 20 trở lên**.

```bash
npm install
```

```bash
npm run dev
```

Mở `http://localhost:3000`. Muốn dùng camera thì trình duyệt phải chạy qua `localhost` hoặc `https`.

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy máy chủ phát triển |
| `npm run build` | Build bản phát hành vào `dist/` |
| `npm run preview` | Xem trước bản đã build |
| `npm run lint` | Kiểm tra kiểu TypeScript |
| `npm test` | Kiểm thử bộ nhận dạng cử chỉ bằng bàn tay giả lập |

## Cấu trúc mã nguồn

```
src/
├── App.tsx                          # Bố cục và trạng thái chính
├── index.css                        # Hệ thống thiết kế (Tailwind v4)
├── components/
│   ├── MolecularViewport3D.tsx      # Cảnh 3D (three.js) cho 4 mô hình
│   ├── FloatingAtomOverlay.tsx      # Lớp thông tin phủ trên khung 3D
│   ├── HandTrackerOverlay.tsx       # Camera, MediaPipe, nút mô phỏng
│   └── ProposalAdvisorModal.tsx     # Hướng dẫn 6 cử chỉ và bảng công thức
├── services/
│   ├── handGestureEngine.ts         # Thuật toán nhận dạng cử chỉ
│   └── pdbService.ts                # Dữ liệu sinh học, trình tự mẫu, công thức
└── types/molecular.ts
tests/gestureEngine.test.ts          # Kiểm thử cử chỉ
```

**Công nghệ:** React 19, TypeScript, Vite, Tailwind CSS v4, three.js, MediaPipe Tasks Vision, Motion, lucide-react.

## Thuật ngữ

Thuật ngữ trong ứng dụng theo SGK Sinh học 10, bộ Kết nối tri thức: DNA, RNA, mRNA, nucleotide, nucleic acid, phosphate, đường pentose (deoxyribose / ribose), base nitrogen, adenine (A), thymine (T), guanine (G), cytosine (C), uracil (U), liên kết hydrogen, liên kết phosphodiester, purine, pyrimidine.

Nếu thấy chỗ nào chưa đúng, hãy mở issue hoặc gửi pull request.
