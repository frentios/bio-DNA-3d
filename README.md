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

## Cử chỉ bàn tay

| Cử chỉ | Tác dụng |
|---|---|
| ✋ Xoè tay | Xoay mô hình theo góc nghiêng của lòng bàn tay (Roll / Pitch / Yaw) |
| 👌 Chụm ngón cái + ngón trỏ rồi mở / khép | Phóng to / thu nhỏ (không phụ thuộc khoảng cách từ tay tới camera) |
| ✌️ Chữ V | Nhìn từ đỉnh, dọc theo trục xoắn |
| 👍 Giơ ngón cái | Tháo xoắn, tách 2 mạch đơn; ở mô hình nucleotide thì tách rời 3 thành phần |
| ✊ Nắm tay và kéo | Xoay tự do theo quán tính |
| 👉 Chỉ ngón trỏ | Trỏ vào một chi tiết để xem công thức và số liên kết hydrogen |
| 🙌 Hai tay xoè, kéo xa / lại gần | Phóng to / thu nhỏ |
| ✊✊ Hai tay nắm (mỗi tay cầm một mạch), kéo ra hai bên | Tách 2 mạch DNA; đưa lại gần để ghép lại |

Nhận dạng cử chỉ dùng [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) và chạy hoàn toàn trên trình duyệt, không gửi hình ảnh đi đâu. Thuật toán:
- chỉ chấp nhận cử chỉ khi tay giữ ổn định vài khung hình, để tránh nhấp nháy;
- làm mượt góc xoay bằng bộ lọc One-Euro;
- dùng được cho cả tay trái lẫn tay phải.

Nếu không có camera, có thể dùng **chuột** (kéo để xoay, cuộn để phóng to, bấm vào chi tiết để chọn), các **thanh trượt** và các **nút mô phỏng cử chỉ**.

## Chế độ trình chiếu cho giáo viên

Bấm **Trình chiếu** trên thanh đầu trang. Mô hình chiếm gần hết màn hình, bên dưới là thanh giáo án 10 bước theo Bài 5 (phần nucleic acid). Mỗi bước tự chuyển mô hình, góc nhìn, mức tách mạch và lớp hiển thị phù hợp, kèm ý chính chữ lớn và câu hỏi gợi mở.

| Phím | Tác dụng |
|---|---|
| `→`, `Space`, `PageDown` | Bước tiếp theo (dùng được với bút trình chiếu) |
| `←`, `PageUp` | Bước trước |
| `Q` | Hiện / ẩn câu hỏi cho học sinh |
| `Esc` | Thoát |

Camera cử chỉ vẫn hoạt động khi trình chiếu. Giáo án nằm trong `src/services/lessonPlan.ts`, có thể sửa hoặc thêm bước.

## Giao diện JARVIS

Giao diện lấy cảm hứng từ HUD của JARVIS trong phim *Iron Man*:
- khung kính góc vát, vòng arc reactor xoay quanh mô hình;
- dòng trạng thái thời gian thực;
- màn hình khởi động ngắn;
- nút **Hologram** chuyển mô hình 3D sang dạng hình chiếu bán trong suốt.

## Dùng khi không có mạng

Trang là một PWA: sau lần mở đầu tiên có mạng, toàn bộ ứng dụng và mô hình nhận dạng tay được lưu vào trình duyệt, nên các lần sau vẫn chạy được khi mất mạng. Trên Chrome / Edge có thể bấm **Cài đặt ứng dụng** trên thanh địa chỉ để dùng như một ứng dụng riêng.

MediaPipe (khoảng 11 MB) chỉ được tải khi bấm **Bật camera**, nên trang mở nhanh hơn.

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
│   ├── MolecularViewport3D.tsx      # Khung 3D: camera, ánh sáng, tương tác, hiệu ứng
│   ├── scene/                       # Hàm dựng cảnh cho từng mô hình (mỗi mô hình 1 file)
│   ├── jarvis/                      # HUD JARVIS, màn khởi động, thanh trình chiếu
│   ├── FloatingAtomOverlay.tsx      # Lớp thông tin phủ trên khung 3D
│   ├── HandTrackerOverlay.tsx       # Camera, MediaPipe, nút mô phỏng
│   └── ProposalAdvisorModal.tsx     # Hướng dẫn 6 cử chỉ và bảng công thức
├── services/
│   ├── handGestureEngine.ts         # Thuật toán nhận dạng cử chỉ
│   ├── lessonPlan.ts                # Giáo án cho chế độ trình chiếu
│   └── pdbService.ts                # Dữ liệu sinh học, trình tự mẫu, công thức
└── types/molecular.ts
tests/gestureEngine.test.ts          # Kiểm thử cử chỉ
scripts/prepare-mediapipe.mjs        # Chép WASM và tải mô hình nhận dạng tay để dùng offline
public/sw.js, manifest.webmanifest   # PWA
```

**Công nghệ:** React 19, TypeScript, Vite, Tailwind CSS v4, three.js, MediaPipe Tasks Vision, Motion, lucide-react.

## Thuật ngữ

Thuật ngữ trong ứng dụng theo SGK Sinh học 10, bộ Kết nối tri thức: DNA, RNA, mRNA, nucleotide, nucleic acid, phosphate, đường pentose (deoxyribose / ribose), base nitrogen, adenine (A), thymine (T), guanine (G), cytosine (C), uracil (U), liên kết hydrogen, liên kết phosphodiester, purine, pyrimidine.

Nếu thấy chỗ nào chưa đúng, hãy mở issue hoặc gửi pull request.
