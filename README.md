# Sân Mây — Một khoảng lặng giữa ngày

Game chùa ảo 2D nhiều người chơi trên trình duyệt: dạo tám khu của một ngôi chùa, lạy Phật, lần chuỗi, thiền, thỉnh chuông, thả hoa đăng, gửi lời chúc, chăm khu vườn riêng và gặp bạn bè trong cùng phòng (tối đa 20 người).

Frontend: HTML/CSS, JavaScript ES Modules, Canvas 2D, Web Audio — không framework, không bundler. Backend: Node.js, Express 5, Socket.IO 4, SQLite (better-sqlite3). Một tiến trình Node phục vụ cả trang web, REST và Socket.IO trên cùng một cổng.

## Chạy

Yêu cầu Node.js 20 trở lên (đã kiểm thử với 20.19.6 trên Windows x64).

```powershell
npm install
npm start
```

Mở http://localhost:43127/?room=MAY-01.

- Dữ liệu được lưu tại `data/sanmay.db` (tự tạo). Xoá file này để làm lại từ đầu.
- `better-sqlite3` được ghim ở `12.8.0` vì đó là bản mới nhất có gói dựng sẵn cho Node 20 trên Windows. Nếu dùng bản khác cho một nền tảng không có gói dựng sẵn, cần Python và trình biên dịch C++ để `npm install` tự build.
- Cấu hình bằng biến môi trường (xem `.env.example`): `PORT`, `HOST`, `DB_FILE`, `TZ_OFFSET_MINUTES` (múi giờ tính nhiệm vụ ngày/tuần, mặc định UTC+7), `TRUST_PROXY`. Có thể dùng `node --env-file=.env server.js`.

## Kiểm thử

```powershell
npm run check   # cú pháp mọi file JS + JSON hợp lệ
npm test        # 26 test: logic, REST, Socket.IO thật, SQLite in-memory, thế giới
```

`npm test` chạy trong một tiến trình (tương thích môi trường Windows chặn tạo test worker). Test thế giới đi bộ thử trên lưới với bán kính nhân vật thật để chắc mọi cổng và vật tương tác đều tới được.

Thử nhiều người trên một máy: mở thêm cửa sổ ẩn danh/trình duyệt khác, hoặc thêm `&slot=2` vào URL để dùng một danh tính khách riêng trong cùng trình duyệt. `&debug=1` chỉ dành cho QA (lộ `window.sanmay` để chụp hình), không vượt quyền server.

## Chơi

| Điều khiển | Tác dụng |
| --- | --- |
| WASD / mũi tên, chạm vào cảnh, joystick | Di chuyển |
| E hoặc chạm vào vật/người | Tương tác (đi tới rồi tương tác) |
| 1 / 2 / 3 / 4 | Lạy / lần chuỗi / chắp tay / vẫy chào |
| Enter | Mở ô chat; Enter để gửi (bong bóng hiện trên tên 6 giây cho người cùng khu); Esc để quay lại |
| M / J / Q | Bản đồ / Nhật ký / Nhiệm vụ |
| Esc | Đóng bảng |

Tám khu: Cổng Tam Quan → Sân Chùa; từ sân đi Chánh Điện (bắc), Vườn Thiền (tây), Hồ Sen (đông); Hồ Sen → Tháp Chuông; Vườn Thiền → Rừng Trúc → Thư Viện. Vườn Thiền có cổng vào **vườn riêng** của mỗi người.

Hoạt động: lạy và lần chuỗi 108 (chỉ tính khi động tác trọn vẹn, server xác nhận), thiền 3–30 phút (đồng hồ do server giữ, chạy cả khi chuyển tab), thỉnh chuông nhỏ và đại hồng chung, thả hoa đăng, lời chúc công khai/riêng tư có cảm xúc và báo cáo, vẽ vườn cát (lưu mẫu), quét lá, pha trà, đọc truyện và lời kinh có ghi nguồn, nghe thầy trụ trì kể chuyện, xin quẻ, ngồi thiền và nghe tụng kinh trong Chánh Điện, tiếng chuông chùa vọng lại vài phút một lần, trồng và tưới cây, sắp đặt vườn, nhiệm vụ ngày/tuần, 10 thành tựu, nhật ký, hồ sơ và đổi trang phục bằng vật phẩm đã nhận. Ngày đêm theo giờ thật (hoặc chu kỳ nhanh/cố định) và thời tiết thay đổi theo phòng.

## Danh tính và dữ liệu

- Mỗi trình duyệt nhận một **token khách** do server cấp; server chỉ lưu bản băm SHA-256. Token cũng là **mã khôi phục** (Cài đặt → Mã khôi phục) để dùng lại tiến trình trên máy khác. Không có mật khẩu.
- Tiến trình (lạy, chuỗi, thời gian thiền, vị trí, vườn, nhiệm vụ, thành tựu, nhật ký), lời chúc và hoa đăng được lưu trong SQLite; reload không mất.
- Mỗi danh tính chỉ có một phiên sống: mở tab thứ hai thì tab cũ tạm dừng.

## Chơi cùng bạn bè và triển khai

- Cùng mạng LAN: chạy server, lấy IPv4 bằng `ipconfig`, chia sẻ `http://<IPv4>:43127/?room=TEN-PHONG`. Server lắng nghe `0.0.0.0`; nếu Windows hỏi, cho phép mạng riêng.
- Phòng công cộng: mã do bạn đặt (2–24 ký tự A–Z, số, `-`), hiện trong danh sách phòng. Phòng riêng: nút "Tạo phòng riêng" trên màn hình vào game tạo mã ngẫu nhiên 10 ký tự; ai có liên kết mới vào được. Mã phòng không phải mật khẩu.
- Qua Internet: chạy sau reverse proxy có HTTPS (Caddy, nginx…) chuyển tiếp cả WebSocket (`/socket.io/`), đặt `TRUST_PROXY=1`. Chỉ cần một tiến trình Node và file SQLite; nên sao lưu `data/sanmay.db` định kỳ. **Dự án chưa được triển khai lên Internet và chưa có URL công khai nào được kiểm chứng.**

## Kiến trúc

```
server.js                 → server/index.js (createGameServer / startServer)
server/
  config/                 cấu hình từ biến môi trường
  database/               mở DB, migration append-only, seed thành tựu/nhiệm vụ
  repositories/           prepared statements theo miền dữ liệu
  services/               identity, moderation + RateLimiter, progression, world (dùng chung map + va chạm), rooms
  routes/api.js           REST
  sockets/index.js        Socket.IO — schema event ghi ở đầu file; server là nguồn xác thực
  middleware/, validators/
public/
  index.html, css/        main / hud / panels / responsive
  data/                   maps/*.json (8 khu + mẫu vườn), dialogues.json, stories.json
  js/main.js              khởi động và nối mọi phần
  js/shared/rules.js      luật dùng chung client/server (tốc độ, thời lượng, giới hạn, vật phẩm, cây)
  js/core/                Game, GameLoop (RAF), SceneManager, Camera, InputManager, AssetLoader
  js/scenes/              Scene cơ sở + 8 khu + vườn riêng
  js/rendering/           SceneRenderer, SpriteRenderer, props, ground, ParticleSystem, LightingSystem
  js/systems/             Collision, Interaction, Audio, DayNight, Weather
  js/entities/            Player, NPC
  js/multiplayer/         Api (REST), SocketClient, RemotePlayer, Interpolation
  js/ui/                  các bảng giao diện và minigames/
tests/                    *.test.mjs, chạy qua tests/run.mjs
```

Server xác thực: tốc độ và va chạm của từng bước đi, thời lượng lạy/lần chuỗi, khoảng cách tới chuông/bến hoa đăng/cổng/vật minigame, cooldown, quyền chủ vườn, vật phẩm sở hữu, kích thước và nội dung lời chúc (lọc từ cơ bản + báo cáo 3 người thì ẩn), rate limit theo socket và theo IP.

Đồ hoạ, nhân vật và âm thanh đều do code tạo ra (Canvas và Web Audio tổng hợp), không dùng ảnh, font hay nhạc từ bên thứ ba. Có thể thay sprite thủ tục bằng sprite sheet thật trong `SpriteRenderer.strip()`.

## Kiểm thử thủ công

1. `npm start`, mở game: thanh tải chạy hết, tạo nhân vật, vào chùa, console không lỗi.
2. Đi bốn hướng và đi chéo; chạm vào cảnh để đi; không xuyên tường/hồ/cây; camera không giật.
3. Đi qua cả tám khu bằng các vòng sáng ở mép cảnh; tên khu hiện khi chuyển.
4. Lạy và lần chuỗi: đi giữa chừng thì không được tính; tròn 108 thì có nút "Vòng mới". Reload rồi kiểm tra số vẫn còn.
5. Thiền 3 phút, chuyển sang tab khác rồi quay lại: đồng hồ vẫn đúng; kết thúc sớm thì Nhật ký ghi đúng số giây.
6. Thỉnh chuông ở Sân Chùa và Tháp Chuông; cửa sổ thứ hai cùng phòng thấy chuông rung và nghe tiếng.
7. Hai trình duyệt cùng phòng: thấy nhau, thấy hành động/biểu cảm, lời chúc, hoa đăng; phòng khác thì tách biệt. Ẩn một người thì không còn thấy họ.
8. Tắt server: hiện mất kết nối; bật lại: tự vào lại phòng ở vị trí cũ.
9. Vườn riêng: gieo cây, đặt/di chuyển/cất đồ, tưới (lần hai phải chờ 3 giờ). Bạn bè vào bằng mã vườn chỉ được xem.
10. Nhiệm vụ: hoàn thành "Gửi một lời chúc", nhận thưởng, mặc màu áo vừa nhận trong "Đổi tên & trang phục".
11. Cài đặt: âm lượng từng kênh, tắt tiếng, chất lượng thấp, chế độ giờ/thời tiết, toàn màn hình; reload vẫn giữ.
12. Trên điện thoại thật: dọc và ngang, joystick, nút hành động, bảng cuộn được, không tràn màn hình.

## Giới hạn đã biết

- Chưa thử trên điện thoại thật (mới thử bằng giả lập Pixel 7), chưa nghe đánh giá âm thanh trên loa, chưa thử tải với 20 trình duyệt thật cùng lúc. FPS 60 mới đo trên một máy desktop.
- Lọc từ chỉ ở mức cơ bản; kiểm duyệt dựa vào báo cáo của người chơi. Chưa có trang quản trị.
- Chưa có tài khoản đăng nhập; mất token (xoá dữ liệu trình duyệt mà chưa lưu mã khôi phục) là mất danh tính.
- Đi bằng cách chạm là đi thẳng có trượt theo vật cản, chưa có tìm đường.
