# Kế hoạch làm game và sản phẩm riêng

Cập nhật: 2026-11-03

## 1. Định hướng

- **Sân Mây** chỉ là dự án cá nhân để chơi. Mình không kiếm tiền từ game mang chủ đề tâm linh.
- Giữ code base của Sân Mây và tách ra thành bộ khung để làm sản phẩm mới.
- **Không** đăng lên Steam (mất phí) và **không** làm vlog.
- Chọn nơi tự có sẵn người chơi, để không phải tự quảng bá.
- Vẫn giữ công việc lập trình web chính. Đây là việc làm thêm và thử nghiệm trong 6–12 tháng.

## 2. Hai hướng kiếm tiền

### Hướng A — Nhận làm minigame cho nhãn hàng hoặc agency (ưu tiên số 1)

- Nhãn hàng thường cần game web nhỏ cho chiến dịch marketing: vòng quay, thu thập vật phẩm, ghép hình, bảng xếp hạng, phát quà. Các mùa đông khách là Tết, Trung thu và dịp ra mắt sản phẩm.
- Hướng này dùng đúng kỹ năng đang có: HTML5 Canvas, backend, realtime, chạy tốt trên điện thoại.
- Tìm việc qua agency quảng cáo, nhóm freelance, hoặc người quen làm marketing.
- Hồ sơ năng lực: một vài link demo chơi được ngay (có thể dùng Sân Mây và các game nhỏ tự làm).

### Hướng B — Game web nhỏ trên các cổng game miễn phí

- Nơi đăng: **CrazyGames, Poki, GameDistribution, itch.io**. Không mất phí đăng, và các cổng này tự đưa người chơi tới.
- Thu nhập: chia tiền quảng cáo hiện trong game. Lúc đầu thường ít.
- Nguyên tắc làm game:
  - hiểu cách chơi trong 10 giây;
  - mỗi lượt chơi ngắn;
  - chơi tốt trên điện thoại;
  - mỗi game làm trong 2–4 tuần.
- Làm nhiều game nhỏ, xem số liệu (lượt chơi, thời gian chơi, tỉ lệ quay lại), rồi đầu tư thêm cho game giữ chân người chơi tốt nhất.

## 3. Tách bộ khung từ Sân Mây (`my-game-kit`)

### Lấy lại gần như nguyên

| Mảng | File trong Sân Mây |
| --- | --- |
| Lõi game | `public/js/core/` — `Game`, `GameLoop`, `Camera`, `InputManager`, `SceneManager`, `AssetLoader` |
| Cảnh | `public/js/scenes/Scene.js` (lớp cảnh gốc) |
| Va chạm, tìm đường, tương tác | `public/js/systems/CollisionSystem.js`, `Pathfinder.js` (A*), `InteractionSystem.js` |
| Âm thanh tự tổng hợp | `public/js/systems/AudioManager.js` |
| Ngày đêm, thời tiết | `public/js/systems/DayNightSystem.js`, `WeatherSystem.js` |
| Hiệu ứng | `public/js/rendering/ParticleSystem.js`, `LightingSystem.js`, `SceneRenderer.js`, `SpriteRenderer.js` |
| Nhân vật vẽ bằng code | `public/js/rendering/CharacterArt.js`, `public/js/ui/CharacterCreator.js` |
| Multiplayer phía client | `public/js/multiplayer/` — `SocketClient`, `Api`, `Interpolation`, `RemotePlayer`, `WorldStateStore` |
| Giao diện | `public/js/ui/dom.js`, `Panels.js`, `DialoguePanel.js`, `minigames/MinigameHost.js` |
| Server nền | `server/index.js`, `server/config/`, `server/middleware/`, `server/validators/` |
| Lưu trữ | `server/database/` (SQLite và migration) và cách tổ chức `server/repositories/` |
| Danh tính và phòng | `server/services/identity.js` (đăng nhập khách bằng token), `rooms.js`, `moderation.js` |
| Trạng thái thế giới | `server/services/worldState.js` (cá nhân / phòng / dùng chung, đồng bộ delta) |
| Hội thoại và cốt truyện | `server/services/narrative.js` (hội thoại phân nhánh, trí nhớ, nhiệm vụ) |
| Phiên chơi chung | `server/services/coop.js` (mời, sẵn sàng, hủy, kết nối lại) |
| Tiến trình | `server/services/progression.js` (nhiệm vụ, thành tựu, nhật ký) |
| Test | `tests/helpers.mjs` (khởi động server thật, kết nối socket thật), `tests/run.mjs` |

### Bỏ đi (nội dung riêng của chùa)

- Các cảnh chùa trong `public/js/scenes/` (trừ `Scene.js`)
- Hình vẽ chủ đề chùa trong `public/js/rendering/`: Buddha, Monk, Abbot, Candle, Gate, Temple…
- Các bảng tu tập: `HallPractice`, `MeditationPanel`, `FortunePanel`, `WishPanel`…
- `public/data/maps/*.json` và `server/content/stories/*.json`
- `hallActions.js`, `journey.js`, `coopActivities.js` (giữ lại để tham khảo cách làm)

### Các bước tách

1. Tạo repo mới `my-game-kit` trên GitHub cá nhân.
2. Chép phần "lấy lại", bỏ phần nội dung chùa.
3. Làm một cảnh mẫu tối giản: một bản đồ, một nhân vật đi lại, một vật tương tác, hai người chơi thấy nhau.
4. Giữ bộ test chạy được.
5. Viết README ngắn: cách tạo cảnh mới, thêm vật thể, thêm minigame.

## 4. Lộ trình 3 tháng

| Tháng | Việc |
| --- | --- |
| 1 | Tách `my-game-kit`. Cho vài người quen chơi thử Sân Mây để học cách quan sát người chơi. |
| 2 | Làm một game web nhỏ, không liên quan tâm linh, trong 3–4 tuần bằng `my-game-kit`. Đăng lên CrazyGames hoặc itch.io. |
| 3 | Xem số liệu, làm thêm một mẫu minigame kiểu marketing (vòng quay hoặc thu thập vật phẩm, có bảng xếp hạng), rồi bắt đầu chào agency hoặc người quen. |

Sau 3 tháng, quyết định dồn sức vào hướng A, hướng B, hay cả hai, dựa trên số liệu và thu nhập thật.

## 5. Việc cần làm trước

- [ ] **Đọc lại hợp đồng lao động:** điều khoản sở hữu trí tuệ và điều khoản cấm làm việc riêng cùng lĩnh vực.
- [ ] **Làm dự án riêng trên máy cá nhân, ngoài giờ làm.** Chuyển hẳn sang `D:\Game\san-may`, không dùng máy công ty.
- [ ] Mỗi repo cá nhân mới: đặt email cá nhân riêng cho repo đó bằng `git config user.email "buituanbinat@gmail.com"` (không có `--global`).
- [ ] Tìm hiểu cách nhận tiền từ cổng game nước ngoài (tài khoản ngân hàng hoặc PayPal, mẫu thuế W-8BEN) và cách kê khai thuế thu nhập cá nhân ở Việt Nam.
