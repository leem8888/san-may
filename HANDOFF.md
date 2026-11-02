# HANDOFF — Sân Mây

Cập nhật: 2026-11-02 (Asia/Bangkok).

## Phiên 2 (Claude) — nhật ký đang làm

Thứ tự đã chọn: **M1 backend (Phase 4 + lõi Phase 5) → M2 world (Phase 2) → M3 gameplay → M4 progression → M5 polish.** Lý do làm backend trước: đồng bộ nhiều khu vực cần schema `sceneId` + world pixels trên Socket.IO; làm world trước sẽ phải viết lại đồng bộ polling.

- [x] Baseline: `npm run check` OK (18 file), `npm test` 11/11 pass.
- [x] Cài `express@5`, `socket.io@4`, `better-sqlite3@12.8.0` (ghim chính xác: bản 12.9+ không có prebuilt Node 20/Windows và máy không có Python để build).
- [x] **M1 backend xong** (xem chi tiết dưới). · [x] **M2 world xong** · [x] **M3 gameplay xong** (trừ trồng cây → M4) · [x] **M4 progression xong** · [x] **M5 polish xong phần làm được trên máy này**

### M1 — đã làm và kiểm thử
- Gốc dự án là ESM (`"type":"module"`), xóa `public/package.json`. `server.js` chỉ gọi `server/index.js` (`createGameServer` / `startServer`).
- `server/`: `config/`, `database/` (migration append-only + seed thành tựu/nhiệm vụ, WAL, FK), `repositories/` (prepared statements), `services/` (identity, moderation + RateLimiter, progression quests/achievements/journal, world, rooms), `routes/api.js`, `sockets/index.js` (schema event ghi ở đầu file), `middleware/` (CSP, auth bearer, rate limit IP, error JSON), `validators/`.
- Luật dùng chung client/server: `public/js/shared/rules.js`. Server import trực tiếp `CollisionSystem` và map JSON của client.
- Guest identity: token 32 byte do server cấp, DB chỉ lưu SHA-256; token cũng là mã khôi phục (`Api.recover`). `?slot=2` dùng danh tính riêng trong cùng trình duyệt để test.
- Server authoritative: kiểm tra tốc độ (≤1.3×SPEED + 24px) và va chạm mỗi `player:move` → `player:correct`; lạy/lần chuỗi chỉ cộng khi đủ thời lượng kể từ `player:action` và không di chuyển; chuông kiểm tra khoảng cách + cooldown theo phòng/khu; lời chúc lưu SQLite, dedupe `clientId`, cooldown 5s, lọc từ, công khai/riêng tư, cảm xúc, báo cáo (3 người → ẩn), chặn người chơi; một phiên sống/guest (tab mới thắng, tab cũ nhận `session:replaced`); tối đa 20/phòng; snapshot 10Hz + keyframe 1s; lưu vị trí 5s/lần và khi rời.
- Client: `multiplayer/Api.js`, `SocketClient.js`, `RemotePlayer.js`, `Interpolation.js` (vẽ trễ 150ms theo đồng hồ server). Đã xóa `RoomClient.js` và API polling cũ.
- Lưu ý khi test bằng sửa DB: server ghi lại vị trí khi người chơi ngắt kết nối, nên phải đóng trang trước rồi mới sửa `player_progress`.

### M2 — đã làm và kiểm thử
- 8 khu (JSON trong `public/data/maps/`, là nguồn chính): gate, courtyard, mainHall, zenGarden, lotusLake, bellTower, bambooForest, library. Liên kết: Cổng↔Sân; Sân↔Chánh Điện/Vườn Thiền/Hồ Sen; Hồ↔Tháp Chuông; Vườn↔Rừng Trúc↔Thư Viện. Bản đồ dùng `ground.layers` (vẽ một lần vào cache), `props` (trang trí, sắp theo y), `objects` (tương tác), `portals` (vùng chuyển khu + `spawn` đích), `obstacles` + va chạm tự sinh từ prop (`PROP_COLLIDERS` trong `CollisionSystem.js`, server dùng chung). `sortY` chỉ đổi thứ tự vẽ; `zoom` co khung hình trong nhà.
- Engine: `core/SceneManager.js` (fade 0.35s, chỉ giữ cache nền 2 khu gần nhất), `scenes/*.js` (Scene cơ sở + 8 lớp con: khói hương, bụi sáng, đom đóm, hoa đăng trôi), `rendering/SceneRenderer.js`, `props.js` (~40 prop vẽ thủ tục nguyên bản), `ground.js`, `ParticleSystem.js` (pool cố định, cap theo chất lượng), `LightingSystem.js` (multiply theo giờ + đèn cộng sáng + trăng/sương), `systems/DayNightSystem.js` (5 buổi; theo giờ thật / chu kỳ 24 phút / cố định), `systems/WeatherSystem.js` (quang/lá rơi/gió/mưa/sương; chế độ tự động là hàm của mã phòng + khung 9 phút nên cả phòng thấy giống nhau, không tốn mạng), `entities/NPC.js` (An ở cổng, bác Tâm ở vườn, thầy Tịnh ở thư viện).
- Chuyển khu: client chạm vùng portal → fade → `player:portal` → server kiểm tra vị trí trong vùng → đổi kênh scene, đặt spawn, trả snapshot → hiện tên khu. Từ chối thì không lặp lại cho tới khi rời vùng.
- Sprite: `SpriteRenderer` sinh từng dải 8 frame theo (ngoại hình, trạng thái, hướng), cache LRU 180 dải; nhãn tên/biểu cảm vẽ sau lớp ánh sáng.
- UI tách module: `js/main.js` (thay `app.js`), `ui/dom.js`, `Panels`, `DialoguePanel` (+ `JsonDialogueProvider` — chỗ cắm AI NPC sau này), `WishPanel` (thiệp, công khai/riêng tư, 4 cảm xúc, báo cáo, ẩn người chơi, phân trang), `MapPanel` (M), `CharacterCreator` (tóc/màu tóc/áo/màu áo/phụ kiện; vật phẩm khóa hiện mờ). CSS tách `css/main|hud|panels|responsive.css`. Cài đặt: chất lượng, chế độ giờ, thời tiết, giảm chuyển động, mã khôi phục.
- `?debug=1` chỉ để QA chụp hình: lộ `window.sanmay.game` (không vượt quyền server).
- Kiểm thử: `npm test` 21/21 (thêm `tests/world.test.mjs`: BFS đi bộ thật từ spawn tới mọi cổng/vật tương tác, liên kết hai chiều, 8 khu tới được từ cổng; ngày/đêm, thời tiết tất định, particle pool; hoa đăng luôn trên mặt nước). Browser: chụp đủ 8 khu buổi trưa, sân chùa đêm mưa, Chánh Điện hoàng hôn; đi bộ thật qua cổng Tam Quan → Sân Chùa được server chấp nhận; console 0 lỗi.

### M3 — đã làm và kiểm thử
- **Thiền** (`ui/MeditationPanel.js`): ngồi ở bồ đoàn Vườn Thiền → chọn 3/5/10/15/30 phút → `meditation:start`; đồng hồ tính từ giờ server (đúng cả khi tab ẩn), nhịp thở 4s, nhạc thiền tổng hợp, camera thu nhẹ (`Camera.setFocus`), UI tối giản (ẩn HUD; khối thiền ở đáy màn hình để không che nhân vật), kết thúc sớm/di chuyển → server tính thời gian thực, reload trong 15s thì tiếp tục.
- **Hoa đăng** (`ui/LanternPanel.js` + `scenes/LotusLakeScene.js`): ở bến Hồ Sen, viết điều ước ≤80 ký tự, chọn 3 kiểu đèn; server kiểm tra khoảng cách/lọc từ/cooldown 8s/dedupe; mọi người trong khu thấy đèn trôi (vị trí tất định), người vào sau nhận đèn ≤10 phút; báo cáo `/api/lanterns/:id/report` có sẵn ở server (UI báo cáo đèn chưa làm).
- **Minigame** (`ui/minigames/`): host chung dừng vòng lặp thế giới khi mở (`Game.suspend`). Vẽ vườn cát (cào 4 răng, hoàn tác/xoá, lưu tối đa 12 mẫu riêng qua `/api/sand-patterns` có kiểm tra toạ độ), Quét lá ở Sân Chùa (chổi đẩy lá theo hướng kéo, gom vào giỏ), Pha trà ở Thư Viện (chọn trà → giữ để đun → giữ để rót tới vạch → nhấp 3 ngụm). Hoàn thành → `activity:complete` (server kiểm tra đứng gần vật thể, 20s/lần) → ghi nhật ký.
- **Thư viện**: `public/data/stories.json` — 9 bài (Pháp Cú kệ 1–2, 5, 103, 183; Kinh Từ Bi; Kinh Kālāma; Kisā Gotamī; Mũi tên tẩm độc; Đại Hầu Vương) diễn ý/kể lại bằng lời mới, có nguồn và câu hỏi suy ngẫm.
- **Tụng kinh** (mõ ở Chánh Điện): bật/tắt nhịp mõ + chuông gõ tổng hợp; tự tắt khi rời Chánh Điện.
- **AudioManager** viết lại: bus master/music/ambient/sfx/ui có thanh âm lượng riêng (lưu LocalStorage), âm môi trường theo khu + thời tiết (gió, nước, mưa, lá, chim, phòng), bước chân, chuông nhỏ/đại hồng chung, nhạc thiền. Toàn bộ là âm tổng hợp. **Chưa nghe thử bằng tai** trên loa thật.
- Kiểm thử: `npm test` 22/22 (thêm test hoa đăng/mẫu cát/activity). Browser: thả hoa đăng thấy đèn trôi; thiền 3 phút rồi kết thúc sớm → server lưu đúng số giây; vẽ 4 đường cát + lưu mẫu + "Xong" ghi nhật ký; pha trà tới bước rót; quét lá; sau khi đóng minigame vòng lặp chạy lại; console 0 lỗi. Sửa trong lúc test: canvas minigame bị méo (dùng `aspect-ratio`), khe gạch trong suốt lộ hình cũ, khối thiền che nhân vật.
- **Chưa có** ở M3: trồng cây (làm cùng vườn riêng ở M4).

### M4 — đã làm và kiểm thử
- **Vườn riêng** (Phase 6 + trồng cây Phase 3): bản đồ mẫu `public/data/maps/garden.json` (có `plot`); mỗi vườn là scene `garden:<mã 8 ký tự>` (SceneManager tạo một instance/vườn, dùng chung map mẫu). Cổng `gardenGate` ở Vườn Thiền → bảng `gardenGatePanel`: vào vườn mình hoặc thăm vườn bạn bằng mã. Server: `garden:enter/place/move/remove/water` — chỉ chủ vườn sửa được, kiểm tra vật phẩm sở hữu, trong khu đất, cách nhau 36px, tối đa 40 vật, tưới cách 3 giờ, phải đứng gần cây. Cây 5 giai đoạn theo `treeStage()` (thời gian + số lần tưới), không bao giờ chết. Trồng → thành tựu `tree-first`; tưới → quest `d-tree`. Client: `scenes/GardenScene.js`, `ui/GardenPanel.js` (đặt/chọn/di chuyển/cất/tưới, chia sẻ mã), `Game.pointHandler` để chạm đặt vật.
- **Nhiệm vụ** (phím Q), **Nhật ký** (phím J: chỉ số, ghi chép riêng thêm/xoá, lịch sử thiền, nhật ký hoạt động do server ghi), **Hồ sơ** (chỉ số, vật phẩm thưởng, 10 thành tựu có ngày mở khoá, nút "Đổi tên & trang phục" dùng lại màn tạo nhân vật; server kiểm tra lại vật phẩm sở hữu và phát `player:update`): `ui/ProgressPanels.js`. Nhận thưởng cập nhật ngay vật phẩm trong màn tạo nhân vật và thanh công cụ vườn.
- Kiểm thử: `npm test` 23/23 (thêm test vườn: chủ/khách, vật khoá, ngoài khu đất, chật chỗ, tưới cooldown, quest/thành tựu; test thế giới kiểm tra lối ra của vườn). Browser: vào vườn, gieo 2 cây, đặt đá + hoa bằng chuột; nhận thưởng nhiệm vụ → "Chậu bonsai" mở khoá trong vườn; mở Nhật ký, Hồ sơ, đổi trang phục (vật khoá không chọn được); console 0 lỗi.

### M5 — đã làm và kiểm thử
- `ui/SocialPanel.js`: chọn phòng trên màn hình vào game (danh sách phòng công cộng, nhập mã, tạo phòng riêng → sao chép liên kết), bảng "Mọi người" (bấm số người ở góc trên) để ẩn/bỏ ẩn, danh sách hoa đăng đang trôi + báo cáo. Server thêm `GET /api/blocks` (tên người đã ẩn).
- Đo trên máy này (Edge headless, desktop): 60 FPS ở Sân Chùa đêm mưa, khung chậm nhất 17ms; heap JS 7MB → 6MB sau 3 vòng qua 8 khu; chỉ 2 cache nền được giữ; số dải sprite cache có giới hạn.
- Giả lập Pixel 7 (412×839, pointer coarse): màn tạo nhân vật vừa màn hình, menu thu gọn, joystick hiện và điều khiển được (đi qua cổng sang Sân Chùa), không cuộn ngang.
- `README.md` viết lại (chạy, cấu hình, triển khai sau reverse proxy, kiến trúc, 12 bước kiểm thử thủ công, giới hạn). Đầu `IMPLEMENTATION_PROGRESS.md` cập nhật.
- `npm test` **24/24**.

### Bổ sung sau M5 — chat bong bóng
- `chat:send {text}` → server làm sạch, tối đa 100 ký tự (`LIMITS.chat`), lọc từ, 1,2s/lần, phát `chat:message` cho người **cùng phòng và cùng khu**; không lưu DB. Client vẽ bong bóng (`chatBubble` trong `SpriteRenderer.js`, tự xuống dòng tối đa 4 dòng) trên tên trong `CHAT_SECONDS` = 6 giây, mờ dần; người đã ẩn không hiện. Enter mở ô chat (`InputManager` chặn hành vi mặc định của Enter để không tự gửi form rỗng), Esc/Enter rỗng quay lại game.
- Test: `npm test` 25/25 (thêm test chat). Browser: hai phiên Edge, bong bóng hiện ở phiên kia và biến mất sau 6 giây.

### Bổ sung — Chánh Điện và chuông chùa
- **Chuông chùa thỉnh thoảng**: `AudioManager.schedule()` phát `templeBell()` (tổng hợp, kênh môi trường) lần đầu sau 40–90 giây, sau đó mỗi 2–5 phút; `onTempleBell` hiện thông báo ngắn và làm đại hồng chung đung đưa nếu đang ở Tháp Chuông. Chỉ phía client, không đồng bộ giữa người chơi.
- **Thầy Viên Minh · Trụ trì** (NPC `abbot` ở Chánh Điện): `dialogues.json` có `randomStory: true` → `JsonDialogueProvider` chèn một truyện ngẫu nhiên từ `stories.json` (kèm câu suy ngẫm + nguồn), không lặp truyện ngay trước đó. Thêm 4 truyện: Chiếc bè (MN 22), Người mù xem voi (Udāna 6.4), Chén trà đầy, Vẫn còn cõng (giai thoại Thiền) — tổng 13.
- **Thiền trong Chánh Điện**: bồ đoàn `hallZen1`, `hallZen2` (`action: meditate`).
- **Xin quẻ**: object `fortune` (prop ống xăm, rung khi lắc qua `game.fortuneShake`), `ui/FortunePanel.js`, `public/data/fortunes.json` (12 quẻ tự viết, ghi rõ là lời suy ngẫm). Rút ngẫu nhiên ở client, 30 giây/lần; server chỉ ghi nhật ký qua `activity:complete` khi đứng cạnh ống xăm.
- **Âm lượng Chánh Điện**: mõ và chuông gõ to gấp đôi; nhạc nền (pad) tự phát nhẹ khi ở trong Chánh Điện (`hallMusic`).
- `AssetLoader` nạp thêm `stories.json`, `fortunes.json`. `npm test` 26/26. Browser: nghe chuyện thầy trụ trì (truyện ngẫu nhiên + nguồn), chạm ống xăm → đi tới → rút quẻ; thông báo chuông chùa tự xuất hiện. **Âm thanh mới vẫn chưa được nghe thử bằng tai.**

### Bổ sung — nhân vật mới, ghế đá, thắp hương, sư tụng kinh
- **Nhân vật** vẽ lại trong `rendering/CharacterArt.js` (`drawCharacter`): tỉ lệ người thật hơn (đầu ≈ 1/6,5 chiều cao), cổ, vai, khuỷu tay, bàn tay, đùi/cẳng, giày, áo đổ bóng, mặt có mắt/mày/miệng, nhìn nghiêng/sau lưng. `SpriteRenderer` chỉ còn cache dải frame và vẽ nhãn.
- **Ngồi ghế đá**: `Scene.seatFor(p)` chọn nửa ghế gần nhất; `SceneRenderer` vẽ người đang `sit` lên mặt ghế, quay mặt ra ngoài. Vị trí thật (server kiểm tra) vẫn ở trước ghế; mọi máy tự tính cùng chỗ ngồi.
- **Menu biểu cảm**: icon vẽ ở vị trí chưa "bay lên" nên không còn bị cắt nửa.
- **Thắp hương**: lư hương `censer` trước ban thờ; `incense:light` (server kiểm tra khoảng cách, 1 phút/người, lưu trong bộ nhớ theo phòng/khu, cháy `INCENSE_SECONDS` = 10 phút, mất khi server khởi động lại hoặc phòng trống), `incense:new` cho cả khu, snapshot cho người vào sau; `MainHallScene` vẽ nén hương ngắn dần, đầu đỏ, khói; ghi nhật ký.
- **Sư Tâm Hòa tụng kinh** (`systems/HallChant.js`): mỗi `CHANT_CYCLE_SECONDS` = 180 giây theo đồng hồ server (ai ở Chánh Điện cũng nghe cùng lúc), tụng 3 lần câu niệm truyền thống "Nam mô Bổn Sư Thích Ca Mâu Ni Phật" bằng giọng tổng hợp (`AudioManager.voice`, giai điệu ngũ cung tự soạn) + mõ + chuông; lời hiện thành bong bóng trên đầu sư. **Không dùng bài hát/bản thu có bản quyền.** Nếu người vận hành có bản thu được phép dùng, đặt ở `public/assets/audio/chanh-dien.mp3`; `GET /api/media` báo có file thì client phát file đó thay giọng tổng hợp.
- `npm test` 27/27 (thêm test thắp hương + lịch tụng). Browser: chờ đúng chu kỳ, sư tụng có lời trên đầu và thông báo; thắp hương có nén hương + khói; menu biểu cảm hiện đủ 5 icon; console 0 lỗi. **Giọng tụng tổng hợp chưa được nghe thử bằng tai** — có thể cần chỉnh âm sắc/âm lượng.

## Đọc trước khi sửa

1. `README.md` (chạy, kiến trúc) rồi các mục M1–M5 ở trên.
2. `npm install`, `npm run check`, `npm test` để xác nhận baseline (27/27).
3. `npm start`, mở `http://localhost:43127/?room=MAY-01`. Thử nhiều người: cửa sổ ẩn danh hoặc `&slot=2`. QA chụp hình: `&debug=1`.
4. Bản đồ JSON trong `public/data/maps/` là nguồn chính (script sinh ban đầu không nằm trong repo). Sau khi sửa bản đồ, chạy `npm test` — `tests/world.test.mjs` sẽ báo nếu cổng/vật không còn đi tới được.
5. Thêm migration mới thì nối vào cuối `server/database/migrations.js`, không sửa migration cũ.

## Còn lại / chưa kiểm chứng

- Chưa thử trên điện thoại thật (iOS/Android), chưa nghe âm thanh trên loa, chưa test tải 20 trình duyệt thật, chưa triển khai Internet — đừng báo là đã làm.
- Lọc từ cơ bản; không có trang quản trị để xem báo cáo (dữ liệu nằm trong bảng `reports`).
- Click/chạm đã có A* (`systems/Pathfinder.js`): lưới 16px, dự phòng 8px cho lối hẹp, kiểm tra bán kính thật, rút gọn đường, đi tới vật tương tác trong tầm. `InputManager` giữ các điểm rẽ, `Player` giới hạn bước để không vượt điểm; WASD/joystick huỷ tự đi. Test đi vòng cây, qua khe hẹp, đích bị chặn và di chuyển thực tới mọi cổng/vật của 8 khu + vườn riêng nằm trong `tests/pathfinding.test.mjs`.
- Vật trang trí trong vườn không chặn đường đi (chỉ trang trí).
- Mất token mà chưa lưu mã khôi phục là mất danh tính khách; chưa có tài khoản/liên kết đăng nhập.
- Thời tiết tự động tính theo đồng hồ máy khách; máy lệch giờ nhiều có thể thấy khác người khác.
