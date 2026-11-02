# TIẾN ĐỘ THỰC TẾ — cập nhật 2026-11-02 (phiên 2)

Chi tiết từng bước, quyết định kỹ thuật và việc tiếp theo nằm trong `HANDOFF.md`. Hướng dẫn chạy/triển khai/kiểm thử thủ công nằm trong `README.md`.

| Phase | Trạng thái thực tế |
| --- | --- |
| 1 — Foundation | Xong (phiên 1), mở rộng: camera có zoom theo khu + focus khi thiền; va chạm elip và va chạm tự sinh từ prop, dùng chung với server. |
| 2 — World | Xong: 8 khu + vườn riêng, chuyển cảnh fade có xác thực server, SceneManager, NPC (3 người, hội thoại JSON qua DialogueProvider), ngày đêm 5 buổi, thời tiết 5 loại độc lập với scene, particle pool, ánh sáng. |
| 3 — Gameplay | Xong: lạy/lần chuỗi 108 (server xác nhận), thiền 3–30 phút (giờ server), chắp tay/vẫy/biểu cảm, chuông nhỏ + đại hồng chung, hoa đăng, trồng/tưới cây, vẽ vườn cát, quét lá, pha trà, thư viện, tụng kinh. |
| 4 — Backend | Xong: Express 5, SQLite (better-sqlite3, migration + seed, prepared statements), REST, guest token server cấp (lưu hash), mã khôi phục, lưu tiến trình. |
| 5 — Multiplayer | Xong: Socket.IO, phòng công cộng/riêng, tối đa 20, đồng bộ vị trí 10Hz + nội suy, hành động, lời chúc/hoa đăng realtime, reconnect, heartbeat, rate limit, báo cáo, ẩn người chơi, server authoritative. |
| 6 — Progression | Xong: 9 nhiệm vụ ngày/tuần có thưởng, 10 thành tựu, hồ sơ, vườn riêng có mời bạn, nhật ký. |
| 7 — Polish | Phần lớn: âm thanh tổng hợp có 5 kênh âm lượng, responsive (kiểm bằng giả lập Pixel 7), chất lượng hình 3 mức, đo 60 FPS desktop, bộ nhớ ổn định khi đi vòng 8 khu. **Chưa**: điện thoại thật, nghe âm thanh bằng tai, tải 20 trình duyệt thật, triển khai Internet. |

## Kiểm thử thực tế (phiên 2)

- `npm run check`: cú pháp + JSON OK. `npm test`: **24/24 pass** (logic, REST, Socket.IO thật với SQLite in-memory, reconnect, capacity 20, thiền, hoa đăng, vườn, nhiệm vụ, thế giới đi bộ được tới mọi cổng/vật).
- Trình duyệt Edge (playwright-cli): hai phiên thấy nhau và đồng bộ; reload giữ tiến trình; đi bộ qua cổng sang khu khác; chụp đủ 8 khu ở trưa, đêm mưa, hoàng hôn; thả hoa đăng; thiền; ba minigame; vườn riêng; nhiệm vụ/nhật ký/hồ sơ; giả lập Pixel 7 với joystick. Console 0 lỗi trong các luồng đã thử.

## Tiêu chí nghiệm thu (mục 23)

Đã đạt và có bằng chứng: 1–17, 19, 20. Mục 18 (chơi được trên mobile) mới kiểm bằng giả lập, chưa trên máy thật. Không có tính năng giả được báo là xong.

---

# MASTER PROMPT GỐC (giữ nguyên nội dung phía dưới)

# MASTER PROMPT — XÂY DỰNG GAME SÂN MÂY

## 1. VAI TRÒ CỦA BẠN

Bạn là một Senior Full-stack Game Developer, Game Designer, UI/UX Designer và 2D Game Engine Developer.

Nhiệm vụ của bạn là xây dựng hoặc nâng cấp một trò chơi web 2D multiplayer có tên:

**SÂN MÂY — Một khoảng lặng giữa ngày**

Đây là một thế giới chùa ảo yên bình, nơi người chơi có thể đi dạo, khám phá, thiền định, lạy Phật, lần chuỗi, thỉnh chuông, thả hoa đăng, trồng cây, gửi lời chúc và tương tác với bạn bè.

Game lấy cảm hứng từ các trải nghiệm chùa ảo trên trình duyệt, nhưng cần có thiết kế, nội dung và tài nguyên nguyên bản, không sao chép trực tiếp hình ảnh, mã nguồn hoặc tài sản của sản phẩm khác.

Mục tiêu là tạo ra một game có chất lượng tốt, nhiều tương tác, cảm giác sống động, hoạt ảnh mượt và có thể chơi cùng bạn bè qua Internet.

Quy mô dự kiến: 2–20 người chơi đồng thời.

**QUAN TRỌNG:**

- Nếu dự án đã tồn tại, trước tiên phải phân tích cấu trúc và mã nguồn hiện có.
- Giữ lại những tính năng đang hoạt động tốt.
- Không xóa hoặc viết lại toàn bộ dự án nếu không thực sự cần thiết.
- Nếu dự án trống, xây dựng mới theo kiến trúc bên dưới.
- Không tạo mockup hoặc giao diện tĩnh thay cho game.
- Không tạo nút bấm giả, chức năng giả hoặc dữ liệu multiplayer giả.
- Không được tuyên bố tính năng hoàn thành khi chưa triển khai và kiểm thử.
- Ưu tiên code dễ hiểu, dễ bảo trì, dễ mở rộng.
- Không hỏi lại những chi tiết không thiết yếu; chủ động chọn phương án hợp lý và ghi rõ quyết định.

---

# 2. CÔNG NGHỆ BẮT BUỘC

## Frontend

- HTML5
- CSS3
- JavaScript ES Modules
- Canvas 2D API
- Web Audio API
- requestAnimationFrame
- LocalStorage cho cài đặt cá nhân

Không sử dụng React, Vue, Angular hoặc Next.js.

Không chuyển sang Phaser trong phiên bản đầu tiên. Tận dụng Canvas 2D hiện tại và tổ chức code theo hướng modular.

## Backend

- Node.js phiên bản LTS
- Express.js
- Socket.IO
- SQLite
- better-sqlite3 hoặc thư viện SQLite tương thích
- REST API cho dữ liệu không yêu cầu realtime

## Kiến trúc

Frontend và backend nằm trong cùng một repository.

Server phải có thể phục vụ toàn bộ static files và kết nối Socket.IO trên cùng một origin.

Chỉ cần chạy một Node.js server là có thể chơi game.

Không yêu cầu Redis, Docker, Kubernetes hoặc dịch vụ cloud trả phí.

---

# 3. PHONG CÁCH THIẾT KẾ

## Visual Style

Thiết kế game theo phong cách:

- 2D illustrated / pixel-art-inspired.
- Góc nhìn top-down hoặc 2.5D giả lập.
- Không khí thiền tịnh, nhẹ nhàng.
- Kiến trúc chùa Việt Nam cách điệu.
- Màu xanh rêu đậm, xanh ngọc, nâu gỗ, vàng ấm.
- Ánh sáng đèn lồng, nến, trăng và mặt trời.
- Các lớp background có chiều sâu.
- Hiệu ứng môi trường chuyển động liên tục.

Bảng màu tham khảo:

- Background: #102625
- Surface: #183330
- Gold: #D9B77E
- Wood: #89674A
- Text: #F2EBD8
- Accent: #8DCBA9

Giao diện phải có tính thẩm mỹ thống nhất, không sử dụng quá nhiều emoji thay cho sprite.

## Nguyên tắc UI/UX

- Game chiếm phần lớn màn hình.
- HUD gọn, không che khuất nhân vật.
- Các panel có nền bán trong suốt.
- Bo góc mềm mại.
- Animation mở/đóng panel.
- Tooltip hướng dẫn.
- Hỗ trợ fullscreen.
- Responsive desktop và mobile.
- Tối ưu trải nghiệm bàn phím, chuột và cảm ứng.

---

# 4. GAME ENGINE CANVAS 2D

Tạo một engine 2D đơn giản có thể tái sử dụng.

Các module bắt buộc:

1. Game Loop
2. Scene Manager
3. Camera System
4. Input Manager
5. Sprite Renderer
6. Animation Controller
7. Collision Detection
8. Particle System
9. Lighting Effects
10. Audio Manager
11. Asset Loader
12. Interaction System
13. Entity Manager
14. Multiplayer State Renderer

## Game Loop

Sử dụng requestAnimationFrame.

Tách update logic và render logic.

Sử dụng deltaTime để đảm bảo tốc độ di chuyển không phụ thuộc FPS.

Xử lý trường hợp tab bị chuyển sang background.

## Camera

- Camera đi theo nhân vật.
- Camera có giới hạn theo bản đồ.
- Hỗ trợ zoom phù hợp.
- Chuyển cảnh mượt.
- Không gây rung hoặc giật.

## Collision

Nhân vật không thể đi xuyên qua:

- Tường.
- Cột.
- Tượng.
- Hồ nước.
- Cây lớn.
- Các vật thể được đánh dấu là không thể đi qua.

## Animation

Hỗ trợ:

- Idle.
- Walk Up.
- Walk Down.
- Walk Left.
- Walk Right.
- Bow.
- Pray.
- Meditate.
- Ring Bell.
- Interact.
- Sit.
- Wave.

Animation cần có trạng thái, frame timing và khả năng hủy/chuyển trạng thái hợp lý.

Nếu chưa có sprite sheet, tạo asset placeholder nguyên bản, đẹp và đồng nhất, đồng thời xây dựng hệ thống cho phép thay thế bằng sprite sheet sau này.

---

# 5. HỆ THỐNG BẢN ĐỒ

Xây dựng ít nhất 8 khu vực có thể khám phá.

## Map 1 — Cổng Tam Quan

- Điểm xuất hiện của người chơi.
- Cổng chùa lớn.
- Đèn lồng hai bên.
- Bảng hướng dẫn.
- NPC chào đón.
- Lối đi vào sân chùa.

## Map 2 — Sân Chùa

- Khu vực multiplayer chính.
- Các nhân vật có thể gặp nhau.
- Cây cổ thụ.
- Đèn lồng.
- Ghế đá.
- Bảng lời chúc.
- Hiệu ứng lá rơi.

## Map 3 — Chánh Điện

- Tượng Phật cách điệu.
- Ánh sáng vàng ấm.
- Thực hiện lạy Phật.
- Chắp tay.
- Lần chuỗi.
- Nghe tụng kinh hoặc âm thanh thiền có bản quyền sử dụng phù hợp.

## Map 4 — Vườn Thiền

- Vườn cát.
- Đá trang trí.
- Cây bonsai.
- Ghế thiền.
- Chế độ thiền định.
- Mini-game vẽ cát.

## Map 5 — Hồ Sen

- Mặt nước chuyển động.
- Hoa sen.
- Cá bơi.
- Thả hoa đăng.
- Viết điều ước.
- Âm thanh nước chảy.

## Map 6 — Tháp Chuông

- Chuông lớn.
- Dây kéo chuông.
- Animation chuông dao động.
- Âm thanh chuông có độ ngân.
- Hiệu ứng sóng âm.

## Map 7 — Rừng Trúc

- Cây trúc chuyển động.
- Gió nhẹ.
- Đường mòn.
- Các vật thể có thể khám phá.
- Không gian thư giãn.

## Map 8 — Thư Viện

- Giá sách.
- Bàn đọc.
- NPC hướng dẫn.
- Các câu chuyện ngắn.
- Câu nói truyền cảm hứng.
- Nội dung Phật giáo được biên soạn cẩn thận, có nguồn phù hợp.

## Chuyển bản đồ

- Có vùng trigger.
- Hiệu ứng fade in/fade out.
- Hiển thị tên khu vực.
- Giữ trạng thái nhân vật.
- Đồng bộ phòng và khu vực khi chơi multiplayer.

---

# 6. NHÂN VẬT

## Tạo nhân vật

Người chơi có thể chọn:

- Tên hiển thị.
- Kiểu tóc.
- Màu tóc.
- Màu trang phục.
- Kiểu trang phục.
- Phụ kiện.

## Điều khiển

Desktop:

- WASD / Arrow Keys: Di chuyển.
- E: Tương tác.
- 1: Lạy Phật.
- 2: Lần chuỗi.
- 3: Chắp tay.
- M: Bản đồ.
- J: Nhật ký.
- ESC: Đóng panel.

Mobile:

- Virtual joystick.
- Nút tương tác.
- Nút mở menu.
- Nút hành động nhanh.

## Nhân vật multiplayer

- Hiển thị tên.
- Hiển thị animation.
- Hiển thị biểu cảm.
- Nội suy vị trí để chuyển động mượt.
- Không teleport liên tục do network jitter.
- Ẩn nhân vật khi rời phòng.

---

# 7. HỆ THỐNG TU TẬP

## 7.1. Lạy Phật 108 lần

- Khi nhấn phím hoặc nút tương tác, nhân vật thực hiện animation cúi lạy.
- Một lần lạy chỉ được tính khi animation hợp lệ hoàn thành.
- Có bộ đếm từ 0 đến 108.
- Có progress bar.
- Có hiệu ứng âm thanh nhẹ.
- Có giới hạn tốc độ để tránh spam.
- Khi hoàn thành 108 lần, hiển thị thông báo chúc mừng nhẹ nhàng.
- Lưu tổng số lần đã thực hiện.
- Cho phép bắt đầu vòng mới.

## 7.2. Lần chuỗi 108 hạt

- Hiển thị chuỗi hạt.
- Mỗi lần tương tác, một hạt được đánh dấu.
- Có animation chuyển hạt.
- Có âm thanh nhẹ.
- Có tiến trình 0/108.
- Hoàn thành vòng chuỗi có hiệu ứng riêng.
- Lưu tiến trình.

## 7.3. Thiền định

Cho phép chọn:

- 3 phút.
- 5 phút.
- 10 phút.
- 15 phút.
- 30 phút.

Khi bắt đầu:

- Nhân vật ngồi thiền.
- Camera chuyển nhẹ.
- UI tối giản.
- Có bộ đếm thời gian.
- Có animation hít thở.
- Có thể bật/tắt nhạc nền.
- Có thể kết thúc sớm.
- Lưu thời lượng thực tế.

Không yêu cầu người chơi phải giữ tab liên tục ở foreground.

## 7.4. Thỉnh chuông

- Nhân vật tiến đến chuông.
- Nhấn E để tương tác.
- Chuông dao động.
- Phát âm thanh.
- Có hiệu ứng ánh sáng hoặc sóng âm.
- Có cooldown tránh spam.

## 7.5. Chắp tay

- Nhân vật chuyển sang animation chắp tay.
- Có thể dùng để chào người chơi khác.
- Đồng bộ animation qua Socket.IO.

---

# 8. CÁC TƯƠNG TÁC KHÁC

## Thả hoa đăng

- Người chơi đến hồ sen.
- Nhập một điều ước hoặc lời chúc.
- Chọn kiểu đèn.
- Xác nhận.
- Đèn xuất hiện trên mặt nước.
- Đèn trôi theo đường chuyển động.
- Các người chơi khác có thể nhìn thấy.
- Lời chúc công khai phải được kiểm duyệt và giới hạn độ dài.

## Trồng cây

- Chọn vị trí hợp lệ.
- Trồng cây.
- Tưới nước.
- Cây phát triển qua các giai đoạn.
- Lưu trạng thái.
- Không yêu cầu người chơi đăng nhập mỗi ngày để cây tồn tại.

## Quét sân

- Mini-game dọn lá.
- Lá phản ứng với tương tác chuột hoặc cảm ứng.
- Có trạng thái hoàn thành.
- Hiệu ứng nhẹ nhàng.

## Pha trà

- Chọn trà.
- Đun nước.
- Rót trà.
- Thưởng trà.
- Animation từng bước.

## Vẽ vườn cát

- Người chơi kéo chuột hoặc chạm màn hình.
- Tạo đường vân trên cát.
- Có nút xóa và làm lại.
- Có thể lưu mẫu vẽ cá nhân.

---

# 9. HỆ THỐNG MULTIPLAYER

Sử dụng Socket.IO.

## Phòng chơi

- Phòng công cộng.
- Phòng riêng.
- Tạo phòng.
- Tham gia bằng mã phòng.
- Chia sẻ link mời.
- Giới hạn tối đa 20 người/phòng.
- Hiển thị số người online.

## Đồng bộ

Các sự kiện chính:

- player:join
- player:leave
- player:move
- player:action
- player:emote
- player:state
- room:join
- room:leave
- room:state
- wish:create
- wish:new
- bell:ring
- lantern:release

Thiết kế schema rõ ràng cho từng event.

Server là nguồn xác thực trạng thái multiplayer.

Không tin tưởng hoàn toàn dữ liệu client.

## Tối ưu

- Client gửi cập nhật vị trí tối đa khoảng 10–15 lần/giây.
- Server giới hạn tốc độ nhận sự kiện.
- Chỉ broadcast trong phòng tương ứng.
- Client sử dụng interpolation.
- Có reconnect.
- Có heartbeat.
- Dọn trạng thái khi disconnect.
- Người chơi vào muộn phải nhận snapshot trạng thái phòng.
- Không broadcast toàn bộ database.

## Bảo mật

- Validate payload.
- Giới hạn độ dài tên và lời chúc.
- Chống spam.
- Không dùng innerHTML với nội dung người dùng chưa được xử lý.
- Không cho client tự tăng thành tựu tùy ý.
- Có chức năng báo cáo nội dung không phù hợp.
- Có cơ chế chặn hoặc ẩn người chơi.

---

# 10. HỆ THỐNG LỜI CHÚC

Người chơi có thể:

- Viết lời chúc.
- Chọn gửi công khai hoặc riêng tư.
- Xem các lời chúc công khai.
- Gửi biểu tượng cảm xúc tích cực.
- Báo cáo lời chúc không phù hợp.

Thiết kế UI lời chúc như một tấm thiệp nhỏ.

Không cho phép HTML hoặc script tùy ý.

Có phân trang hoặc giới hạn số lời chúc tải mỗi lần.

Lời chúc công khai được lưu vào SQLite và đồng bộ realtime.

---

# 11. NGÀY ĐÊM VÀ THỜI TIẾT

## Ngày và đêm

- Sáng.
- Trưa.
- Hoàng hôn.
- Tối.
- Đêm khuya.

Có thể đồng bộ theo giờ địa phương hoặc dùng chu kỳ thời gian trong game.

Hiệu ứng:

- Ánh sáng môi trường.
- Màu bầu trời.
- Độ sáng đèn lồng.
- Bóng đổ.
- Sương.
- Ánh trăng.

## Thời tiết

- Trời quang.
- Mưa nhẹ.
- Sương mù.
- Gió.
- Lá rơi.

Weather Engine phải hoạt động độc lập với Game Scene.

Tạo particle effects bằng Canvas 2D.

Không tạo quá nhiều particle gây giảm FPS.

Có tùy chọn giảm hiệu ứng cho thiết bị yếu.

---

# 12. HỆ THỐNG ÂM THANH

Audio Manager cần hỗ trợ:

- Background music.
- Ambient sound.
- Sound effects.
- UI sounds.

Các âm thanh:

- Tiếng chuông.
- Tiếng gió.
- Tiếng chim.
- Tiếng nước.
- Tiếng mưa.
- Tiếng bước chân.
- Tiếng lá.
- Nhạc thiền.

Có các thanh chỉnh âm lượng riêng.

Có nút mute toàn bộ.

Xử lý autoplay policy của trình duyệt: chỉ phát âm thanh sau tương tác hợp lệ của người dùng.

Không tự động tải hoặc sử dụng âm thanh có bản quyền khi chưa có quyền sử dụng.

---

# 13. NHIỆM VỤ HẰNG NGÀY

Tạo nhiệm vụ như:

- Thiền 5 phút.
- Lạy Phật 10 lần.
- Thỉnh chuông 3 lần.
- Gửi một lời chúc.
- Đi dạo trong vườn.
- Chăm sóc một cây.

Có:

- Daily quest.
- Weekly quest.
- Progress.
- Completion status.
- Reward.

Phần thưởng có thể là:

- Huy hiệu.
- Trang phục.
- Phụ kiện.
- Vật phẩm trang trí.

Không sử dụng cơ chế ép người chơi phải đăng nhập liên tục.

---

# 14. THÀNH TỰU

Các thành tựu ví dụ:

- Lần đầu ghé chùa.
- Hoàn thành 108 lần lạy.
- Hoàn thành một phiên thiền.
- Thỉnh chuông lần đầu.
- Thả hoa đăng đầu tiên.
- Khám phá đủ 8 khu vực.
- Trồng cây đầu tiên.
- Tham gia một phiên thiền chung.

Lưu thành tựu vào SQLite.

Có trang xem bộ sưu tập thành tựu.

---

# 15. KHÔNG GIAN CÁ NHÂN

Mỗi người chơi có một khu vườn nhỏ.

Cho phép:

- Đặt cây.
- Đặt đá.
- Đặt đèn lồng.
- Trang trí.
- Thay đổi bố cục.
- Lưu vị trí vật thể.
- Mời bạn bè đến tham quan.

Đảm bảo server kiểm tra quyền sở hữu trước khi sửa đổi khu vườn.

---

# 16. NPC

Tạo các NPC:

## Chú Tiểu

- Chào người chơi.
- Hướng dẫn điều khiển.
- Giới thiệu các khu vực.
- Gợi ý nhiệm vụ.

## Người Giữ Vườn

- Hướng dẫn trồng cây.
- Giới thiệu mini-game.
- Chia sẻ câu chuyện ngắn.

## Người Giữ Thư Viện

- Giới thiệu sách.
- Hiển thị câu chuyện.
- Hướng dẫn suy ngẫm.

NPC cần có:

- Sprite.
- Idle animation.
- Dialogue panel.
- Tương tác bằng E hoặc chạm.
- Nội dung hội thoại được cấu hình bằng JSON.

Không bắt buộc tích hợp AI API trong phiên bản đầu tiên.

Thiết kế interface để sau này có thể bổ sung AI NPC.

---

# 17. DATABASE

Sử dụng SQLite.

Thiết kế các bảng tối thiểu:

- players
- player_profiles
- player_progress
- player_achievements
- wishes
- lanterns
- gardens
- garden_objects
- quests
- player_quests
- meditation_sessions
- room_history

Có schema migration và seed data.

Sử dụng prepared statements.

Không lưu password dạng plaintext.

Nếu chưa triển khai đăng nhập, sử dụng guest identity bằng token ngẫu nhiên được server phát hành, không dùng tên hiển thị làm định danh.

Có phương án khôi phục danh tính guest hoặc liên kết tài khoản trong tương lai.

---

# 18. CẤU TRÚC THƯ MỤC

Đề xuất:

s an-may/
  package.json
  .env.example
  README.md

  server/
    index.js
    config/
    routes/
    sockets/
    services/
    repositories/
    database/
    middleware/
    validators/

  public/
    index.html

    css/
      main.css
      hud.css
      panels.css
      responsive.css

    js/
      main.js

      core/
        Game.js
        GameLoop.js
        SceneManager.js
        Camera.js
        InputManager.js
        AssetLoader.js

      rendering/
        CanvasRenderer.js
        SpriteRenderer.js
        ParticleSystem.js
        LightingSystem.js

      entities/
        Player.js
        NPC.js
        InteractiveObject.js

      systems/
        CollisionSystem.js
        AnimationSystem.js
        InteractionSystem.js
        AudioManager.js
        WeatherSystem.js
        DayNightSystem.js

      scenes/
        TempleGateScene.js
        CourtyardScene.js
        MainHallScene.js
        MeditationGardenScene.js
        LotusLakeScene.js
        BellTowerScene.js
        BambooForestScene.js
        LibraryScene.js

      multiplayer/
        SocketClient.js
        RemotePlayer.js
        Interpolation.js

      ui/
        HUD.js
        DialoguePanel.js
        WishPanel.js
        QuestPanel.js
        InventoryPanel.js
        SettingsPanel.js

      data/
        maps/
        dialogues/
        quests/
        achievements/

    assets/
      sprites/
      backgrounds/
      tilesets/
      particles/
      audio/
      fonts/

  tests/

Có thể điều chỉnh cấu trúc dựa trên dự án hiện tại, nhưng phải đảm bảo tách module rõ ràng.

---

# 19. TỐI ƯU HIỆU NĂNG

Mục tiêu:

- 60 FPS trên desktop thông thường.
- Cố gắng duy trì ít nhất 30 FPS trên mobile phổ biến.
- Hỗ trợ 2–20 người chơi.
- Không memory leak khi chuyển map.
- Không tạo animation loop trùng lặp.
- Không tạo Socket.IO listener trùng lặp.
- Không tải lại asset không cần thiết.

Sử dụng:

- Asset caching.
- Sprite batching ở mức hợp lý.
- Culling vật thể ngoài camera.
- Particle pooling.
- Device Pixel Ratio có giới hạn.
- Network throttling.
- Client interpolation.

Có màn hình loading với tiến trình tải asset.

---

# 20. RESPONSIVE

Desktop:

- Canvas chiếm phần lớn màn hình.
- HUD ở các góc.
- Thanh hành động phía dưới.
- Điều khiển WASD.

Mobile:

- Canvas tự điều chỉnh.
- Joystick cảm ứng.
- Nút hành động lớn.
- Panel có thể cuộn.
- Không tràn màn hình.
- Hỗ trợ portrait và landscape ở mức phù hợp.

Không làm méo tỉ lệ bản đồ hoặc sprite.

---

# 21. QUY TẮC PHÁT TRIỂN

Không triển khai tất cả trong một file.

Không viết một file JavaScript hàng nghìn dòng chứa toàn bộ logic.

Không sử dụng setInterval cho game loop chính.

Không lưu trạng thái multiplayer quan trọng chỉ ở client.

Không sử dụng dữ liệu giả để tuyên bố multiplayer đã hoàn thành.

Không tạo các nút UI không có chức năng.

Không tự ý thay thế những chức năng đang hoạt động tốt.

Không dùng ảnh có bản quyền không rõ ràng.

Không hardcode API key.

Không sử dụng dependency không cần thiết.

Không lạm dụng CSS animation cho các đối tượng trong game world.

Mọi chức năng phải có logic xử lý, trạng thái, phản hồi UI và kiểm thử phù hợp.

---

# 22. KẾ HOẠCH TRIỂN KHAI

Không cố gắng hoàn thành toàn bộ dự án trong một lần sinh code.

Hãy chia thành các phase có thể chạy và kiểm thử độc lập.

## Phase 1 — Foundation

- Phân tích code hiện tại.
- Thiết kế kiến trúc.
- Game Loop.
- Canvas Renderer.
- Camera.
- Input.
- Player.
- Animation.
- Collision.
- Asset Loader.

## Phase 2 — World

- 8 bản đồ.
- Chuyển cảnh.
- NPC.
- Vật thể tương tác.
- Ánh sáng.
- Ngày đêm.
- Thời tiết.

## Phase 3 — Gameplay

- Lạy Phật.
- Lần chuỗi.
- Thiền.
- Chắp tay.
- Thỉnh chuông.
- Thả hoa đăng.
- Trồng cây.
- Mini-game.

## Phase 4 — Backend

- Express.
- SQLite.
- Database migration.
- REST API.
- Guest identity.
- Lưu tiến trình.

## Phase 5 — Multiplayer

- Socket.IO.
- Phòng chơi.
- Đồng bộ nhân vật.
- Đồng bộ hành động.
- Lời chúc realtime.
- Reconnect.
- Rate limiting.

## Phase 6 — Progression

- Nhiệm vụ.
- Thành tựu.
- Hồ sơ.
- Khu vườn cá nhân.
- Nhật ký.

## Phase 7 — Polish

- Audio.
- Animation.
- Particle effects.
- Responsive.
- Tối ưu.
- Kiểm thử.
- Sửa lỗi.

Mỗi phase phải kết thúc bằng một phiên bản chạy được.

---

# 23. TIÊU CHÍ NGHIỆM THU

Game chỉ được coi là hoàn thành khi:

1. Chạy được bằng npm install và npm start.
2. Không có lỗi nghiêm trọng trong browser console.
3. Người chơi di chuyển được.
4. Camera hoạt động đúng.
5. Va chạm hoạt động.
6. Có thể di chuyển giữa 8 khu vực.
7. Các hành động có animation thực.
8. Có thể hoàn thành 108 lần lạy.
9. Có thể hoàn thành 108 lần chuỗi.
10. Thiền định có timer hoạt động.
11. Chuông có âm thanh và animation.
12. Lời chúc được lưu vào SQLite.
13. Hai trình duyệt khác nhau nhìn thấy nhau trong cùng phòng.
14. Hành động được đồng bộ giữa hai trình duyệt.
15. Reload không làm mất tiến trình đã lưu.
16. Người chơi mất kết nối không bị kẹt lại trong phòng.
17. Các panel hoạt động.
18. Có thể chơi trên mobile.
19. Không có chức năng giả được báo là đã hoàn thành.
20. Có README hướng dẫn chạy và triển khai.

Tạo automated tests cho các logic có thể kiểm thử và hướng dẫn manual testing cho gameplay, âm thanh, đồ họa và multiplayer.

---

# 24. YÊU CẦU VỀ KẾT QUẢ

Tôi không muốn bạn chỉ giải thích cách làm.

Tôi muốn bạn trực tiếp tạo và chỉnh sửa mã nguồn trong workspace hiện tại.

Trước tiên:

1. Kiểm tra toàn bộ cấu trúc dự án.
2. Phân tích các chức năng đang có.
3. Liệt kê những gì có thể tái sử dụng.
4. Đề xuất kiến trúc cuối cùng.
5. Tạo kế hoạch triển khai.
6. Bắt đầu thực hiện Phase 1 ngay.

Sau mỗi phase:

- Liệt kê file đã tạo hoặc chỉnh sửa.
- Giải thích ngắn những chức năng đã triển khai.
- Chạy kiểm thử có thể thực hiện.
- Báo cáo kết quả kiểm thử thực tế.
- Nêu những chức năng chưa hoàn thành.
- Sửa lỗi phát hiện được.
- Đảm bảo dự án vẫn chạy.

Nếu công cụ hỗ trợ tiếp tục làm việc, hãy lần lượt thực hiện các phase tiếp theo cho đến khi hoàn thành. Nếu bị giới hạn context hoặc thời gian, hãy lưu trạng thái tiến độ vào IMPLEMENTATION_PROGRESS.md để phiên làm việc tiếp theo có thể tiếp tục chính xác.

Không tự tuyên bố đã hoàn thành tất cả nếu mới chỉ xây dựng một phần.

---

# 25. MỤC TIÊU CUỐI CÙNG

Tạo ra một game chùa ảo trên trình duyệt:

- Đẹp.
- Yên bình.
- Sống động.
- Có nhiều hoạt động thực sự.
- Có thể khám phá.
- Có thể chơi cùng bạn bè.
- Có dữ liệu được lưu.
- Chạy nhẹ.
- Không yêu cầu hạ tầng phức tạp.
- Dễ mở rộng trong tương lai.

Ưu tiên chất lượng trải nghiệm thực tế hơn số lượng tính năng.

**HÃY BẮT ĐẦU PHÂN TÍCH DỰ ÁN VÀ TRIỂN KHAI NGAY.**

