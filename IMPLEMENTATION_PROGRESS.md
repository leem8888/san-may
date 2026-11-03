# SÂN MÂY — TỔNG QUAN DỰ ÁN

Cập nhật: 2026-11-03. Đây là bản tổng quan: dự án gồm gì, đang ở đâu, còn thiếu gì. Chi tiết kỹ thuật từng bước và cách làm tiếp nằm trong `HANDOFF.md`; hướng dẫn chạy nằm trong `README.md`; hướng dẫn deploy nằm trong `DEPLOY.md`; kế hoạch làm game riêng nằm trong `KE_HOACH_LAM_GAME.md`.

## Đề bài

| File | Nội dung | Trạng thái |
| --- | --- | --- |
| `IMPLEMENTATION_Parse1.md` | Master Prompt gốc, Phase 1–7: nền tảng, 8 khu, gameplay tu tập, backend, multiplayer, progression, polish | Xong (xem mục "Parse 1") |
| `IMPLEMENTATION_Parse2.md` | SÂN MÂY 2.0, 5 prompt: NPC có câu chuyện; chơi hợp tác; thế giới phản ứng & lưu lâu dài; hành trình 20 phút; Chánh Điện nâng cao | **Xong 5 prompt** (xem mục "Parse 2"); còn chờ playtest với người chơi thật |

## Kiến trúc

Một tiến trình Node.js phục vụ trang web, REST và Socket.IO trên cùng một cổng.

- **Client:** HTML/CSS, ES Modules, Canvas 2D, Web Audio (mọi âm thanh đều tổng hợp), không framework, không bundler.
- **Server:** Express 5, Socket.IO 4, SQLite (better-sqlite3, migration append-only).
- **Nguồn xác thực:** server kiểm tra di chuyển, va chạm, thời lượng động tác, khoảng cách tới vật thể, cooldown, quyền sở hữu và phần thưởng.
- **Dùng chung client/server:** luật chơi (`public/js/shared/`), bản đồ JSON và hệ va chạm.

## Parse 1 — đã có

| Mảng | Nội dung chính |
| --- | --- |
| Thế giới | 8 khu (Cổng Tam Quan, Sân Chùa, Chánh Điện, Vườn Thiền, Hồ Sen, Tháp Chuông, Rừng Trúc, Thư Viện) + vườn riêng mỗi người; chuyển cảnh fade có server xác thực; ngày đêm 5 buổi; thời tiết 5 loại đồng bộ theo phòng; ánh sáng, particle, cá koi, mèo vàng; tìm đường A* khi chạm để đi |
| NPC | Chú tiểu An, Bác Lâm (giữ vườn), Thầy Minh (thư viện) trò chuyện qua server, có lựa chọn, nhớ câu trả lời, đổi lời theo buổi/thời tiết/mức quen biết; trụ trì Thầy Viên Giác kể truyện có nguồn; Sư Tâm Hòa tụng kinh mỗi 3 phút |
| Nhân vật | Tạo nhân vật (tóc, áo, phụ kiện), vẽ thủ tục tỉ lệ người, nhiều động tác; ngồi ghế đá/bồ đoàn; biểu cảm; chat bong bóng 6 giây |
| Tu tập | Lạy và lần chuỗi 108 (server đếm), thiền 3–30 phút (giờ server), chuông nhỏ + đại hồng chung, tụng kinh, thắp hương, mâm lễ/dâng lễ (cửa hàng điểm), xin quẻ, thầy trụ trì kể truyện có nguồn, sư tụng mỗi 3 phút, tiếng chuông chùa vọng định kỳ |
| Hoạt động | Hoa đăng trên hồ, lời chúc (công khai/riêng tư, cảm xúc, báo cáo), vẽ vườn cát (cá nhân + dùng chung theo phòng), quét lá, pha trà, thư viện 13 truyện có nguồn, trồng/tưới cây và trang trí vườn riêng |
| Tiến trình | 9 nhiệm vụ ngày/tuần, 10 thành tựu, vật phẩm thưởng, nhật ký, hồ sơ |
| Multiplayer | Phòng công cộng/riêng (tối đa 20), snapshot 10Hz + nội suy, reconnect, một phiên/khách, rate limit, ẩn người chơi |
| Danh tính | Guest token do server cấp (chỉ lưu hash), mã khôi phục |

Đã đạt 19/20 tiêu chí nghiệm thu của Parse 1. Mục "chơi được trên mobile" mới kiểm bằng giả lập.

## Parse 2 — tiến độ

| # | Prompt | Trạng thái |
| --- | --- | --- |
| 3 (nền) | WorldStateManager: trạng thái cá nhân / phòng / dùng chung, có version, hết hạn, SQLite, đồng bộ delta | **Xong** — hương Chánh Điện đã chuyển sang dùng |
| 1 | NPC có câu chuyện, lịch sinh hoạt, trí nhớ, quan hệ: An "Chiếc chuông bị lãng quên" (4 chương), Bác Lâm "Khu vườn bị lãng quên" (3), Thầy Minh "Những bức thư chưa gửi" (3) | **Xong** — StoryEngine/DialogueEngine phía server, hội thoại phân nhánh có trí nhớ và mức quen biết, lịch sinh hoạt NPC theo giờ chùa, 3 câu chuyện chơi trọn từ đầu tới cuối (vật thể truyện, giải đố hoa sen, chuông treo cho cả phòng, góc vườn cũ khôi phục chung, lá thư riêng tư), phần thưởng trang trí vườn riêng |
| 2 | Chơi hợp tác: phiên mời/chấp nhận/sẵn sàng; bàn trà hai người, thiền chung, cùng thỉnh chuông, khôi phục vườn chung, câu đố hợp tác | **Xong** — phiên hợp tác do server quản lý (mời, từ chối, sẵn sàng, hủy, mất kết nối/vào lại, rời khu, chống spam); 5 hoạt động + chào nhau, ngồi cạnh, chụp ảnh chung; kỷ niệm chung trong Nhật ký |
| 3 | Thế giới phản ứng tức thì; chuỗi lâu dài: vườn hồi sinh (5 giai đoạn), ánh sáng Chánh Điện | **Xong phần A** — chuông làm chim bay, đèn lồng đung đưa, NPC quay nhìn; phản chiếu hoa đăng; dọn & trang trí sân chùa trong phiên (thấy chung cả phòng); vườn hồi sinh 5 giai đoạn có hiệu ứng, lời NPC và tương tác riêng; trạng thái còn sau khi khởi động lại server. Chuỗi B (đèn Chánh Điện) là hành trình ở Prompt 4 — xong |
| 4 | Hành trình "Ánh sáng trong Chánh điện" (5 giai đoạn, JourneyDirector, telemetry riêng tư) | **Xong** — 5 giai đoạn chơi được một mình (An hỗ trợ) hoặc cùng bạn; câu đố trang sách và hốc tường; dâng hoa / thắp nến / suy ngẫm; đèn cổ sáng và được lưu; đoạn kết kèm quà kỷ niệm; tạm dừng, thẻ giai đoạn, gợi ý khi đứng yên lâu; telemetry không tên và thống kê cho chủ dự án. Thời lượng 15–25 phút là con số thiết kế, chưa đo bằng playtest thật |
| 5 | Chánh Điện nâng cao: phiên lạy 9/27/54/108, chuỗi hạt trực quan, đọc kinh, dâng hoa, thắp nến, sổ cầu nguyện, nghi thức chung, chiếc đèn cổ | **Xong** — phiên lạy 9/27/54/108 với động tác quỳ lạy nhiều giai đoạn, tạm dừng/tiếp tục, chế độ tập trung; vòng 108 hạt trực quan; trình đọc có dấu trang và thuật ngữ (nghe đọc chưa triển khai vì chưa có bản thu được phép); dâng hoa mang tới bàn thờ; thắp nến theo vị trí; sổ cầu nguyện riêng tư/công khai; cùng đọc, thiền chung trong Chánh Điện; đèn cổ đủ 5 trạng thái. Đã kiểm thủ công trên Edge (desktop + khung điện thoại) với hai người chơi |

## Kiểm thử

`npm run check` (157 file JS + JSON) và `npm test`: **90/90 pass**. Đã kiểm trên trình duyệt Edge thật (nhiều phiên song song) và giả lập Pixel 7.

## Chưa kiểm chứng / giới hạn

- Chưa thử trên điện thoại iOS/Android thật. Chưa test tải 20 trình duyệt thật. Âm thanh tổng hợp chưa được nghe đánh giá bằng tai. Chưa triển khai lên Internet.
- Lọc từ ngữ ở mức cơ bản; chưa có trang quản trị xem báo cáo vi phạm.
- Hương, chuông, hoa đăng gần đây chỉ lưu trong bộ nhớ hoặc có thời hạn ngắn theo thiết kế.

## Deploy — việc tiếp theo

Cập nhật: 2026-11-03. Đã chọn **Oracle Cloud gói Always Free** (máy ảo Ubuntu ARM + Caddy https + SQLite trên ổ đĩa máy ảo). Hướng dẫn từng bước nằm trong `DEPLOY.md`. Chưa bắt đầu triển khai.

Checklist (đánh dấu khi xong):

- [ ] Tạo tài khoản Oracle, chọn Home Region (thử Singapore, hết máy thì Tokyo/Osaka) — `DEPLOY.md` mục 1
- [ ] Tạo máy ảo `VM.Standard.A1.Flex` 1 OCPU / 6 GB, Ubuntu 24.04, cất file khóa SSH — mục 1
- [ ] Mở cổng 80/443 ở Security List **và** iptables trong máy — mục 2
- [ ] SSH vào được từ máy nhà — mục 3
- [ ] Cài Node 22, git, sqlite3, Caddy — mục 4
- [ ] Clone repo, `npm ci`, `npm test` pass trên máy ảo — mục 5
- [ ] Tạo tên miền DuckDNS trỏ về Public IP — mục 6
- [ ] Tạo `~/sanmay.env` (DB ngoài thư mục code, `TRUST_PROXY=1`, `OWNER_TOKEN`) — mục 7
- [ ] Chạy dịch vụ `sanmay` bằng systemd, `/healthz` trả `{"ok":true}` — mục 8
- [ ] Cấu hình Caddy, mở được `https://<tên>.duckdns.org` — mục 9
- [ ] Bật sao lưu hằng ngày, thử tải bản sao lưu về máy nhà — mục 11
- [ ] Thử cập nhật bằng `git pull && npm ci && npm test && sudo systemctl restart sanmay` — mục 12
- [ ] Mời vài người chơi thử qua link thật; theo dõi `/api/owner/journey`

Sau khi deploy xong: cập nhật mục "Chưa kiểm chứng / giới hạn" (bỏ "Chưa triển khai lên Internet"), ghi lại tên miền, vùng và cấu hình máy đã dùng.

## Cập nhật gameplay ngày 2026-11-03

- Quán chay tại cổng Tam Quan dùng ghế cố định theo bàn, chọn ghế trực tiếp trên bản đồ hoặc chọn ghế trống từ bàn; gọi món, phục vụ và dọn bàn được đồng bộ qua server.
- Ví được gọi là xu trong thông báo; giao diện dùng icon xu tự vẽ sau số tiền. Mức nhận hằng ngày là 300, giá vật phẩm và món ăn không đổi.
- Khách trang trí phía client tăng từ 8 lên 16, không tham gia multiplayer registry hay lưu dữ liệu.
- Móc treo chuông gió được vẽ rõ ngay dưới mái cổng và chuông hiện ra theo world state khi hoàn thành truyện.
- Chi tiết còn lại và lưu ý kiểm tra được ghi tại `HANDOFF.md`.

## Tạo hình nhân vật — 2026-11-03

- Sprite người lớn có chu kỳ đi bộ 12 khung hình, bước chân luân phiên có khớp gối, tay đánh ngược chân, độ nảy thân nhỏ và vạt áo chuyển động theo nhịp.
- Chỉnh tỉ lệ đầu, thân và chân để dáng người bớt lùn đầu, chuyển động bám đất hơn. Tạo hình riêng của chú tiểu và trụ trì giữ nguyên.
- Nhãn tên được đặt cao hơn theo kích thước nhân vật để tránh che mặt.
- Thay đổi chỉ ở hiển thị client; tốc độ, va chạm và giao thức multiplayer không đổi. Chưa QA trực quan trên trình duyệt.
