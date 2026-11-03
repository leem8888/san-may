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

## Parse 2 (SÂN MÂY 2.0) — kế hoạch và nhật ký

Đề bài: `IMPLEMENTATION_Parse2.md` (5 prompt). Master Prompt gốc đã chuyển sang `IMPLEMENTATION_Parse1.md`; `IMPLEMENTATION_PROGRESS.md` giờ là **bản tổng quan dự án**, file này là nhật ký kỹ thuật.

Baseline lúc bắt đầu Parse 2 (sau 2 commit của chủ dự án `f7ba422`, `a079e97`: Pathfinder A*, cửa hàng điểm + mâm lễ, cát dùng chung theo phòng, mèo vàng, chân dung NPC, migration v2–v3): `npm run check` 111 file, `npm test` 49/49.

Thứ tự triển khai (theo phụ thuộc, mỗi bước chạy được + test + cập nhật tài liệu):
1. **Nền**: migration v4 + `WorldStateManager` (scope personal / room / shared, version, expires_at, delta qua Socket.IO, snapshot cho người vào sau) — Prompt 3 §2, §8, §9.
2. **StoryEngine + DialogueEngine phía server** (đồ thị hội thoại theo dữ liệu: điều kiện theo cờ/chương/giờ/thời tiết/mức quen biết, hiệu ứng do server áp dụng; mỗi người có phiên hội thoại riêng), NPC memory/relationship — Prompt 1 §4–7.
3. **Lịch sinh hoạt NPC**: vị trí là hàm thuần của đồng hồ server (chu kỳ "giờ sinh hoạt chùa"), đi bằng Pathfinder, client và server tính giống nhau; NPC không biến mất khi đang hội thoại — Prompt 1 §3.
4. **3 câu chuyện**: An (4 chương), Bác Lâm (3), Thầy Minh (3). Đổi tên: người giữ vườn → Bác Lâm, thủ thư → Thầy Minh, trụ trì → Thầy Viên Giác (tránh trùng "Minh").
5. **CooperativeSessionManager** + bàn trà hai người, thiền chung, cùng thỉnh chuông, vườn chung, câu đố hợp tác — Prompt 2.
6. **Thế giới phản ứng + 2 chuỗi lâu dài** (vườn hồi sinh 5 giai đoạn, ánh sáng Chánh Điện) — Prompt 3.
7. **JourneyDirector** "Ánh sáng trong Chánh điện" + telemetry riêng tư — Prompt 4.
8. **Chánh Điện nâng cao** — Prompt 5.

### P2-1 — WorldStateManager (xong)
- Migration **v4**: `world_state` (id = scope|owner|scene|object|type, value JSON ≤ 4KB, version, updated_at, expires_at) + các bảng cho bước 2: `story_progress`, `story_flags`, `dialogue_choices`, `npc_relationships`, `story_log`.
- `server/services/worldState.js`: `stateKey(scope, owner, scene, object, type)` (owner = player id / mã phòng / 'world'), `WorldStateManager.get/value/update/set/remove/visible/purgeExpired`; `update` là read-modify-write trong transaction, hỗ trợ `expectVersion` (ném `StateConflictError` khi dữ liệu đã cũ) và `ttlMs`. Sự kiện `change` → `server/sockets/world.js` phát `world:delta` đúng đối tượng (cá nhân → chỉ chủ; phòng → kênh khu/phòng; chung → mọi người), dọn hết hạn mỗi 30s. Snapshot vào phòng/đổi khu có `scene.world`. ID công khai không chứa owner.
- Client: `multiplayer/WorldStateStore.js` (chỉ nhận version mới hơn; ưu tiên personal > room > shared; snapshot thay thế dữ liệu của khu), `main.js` gọi `scene.onWorldState(record, store)` cho các scene cần phản ứng.
- Người dùng đầu tiên: **hương ở Chánh Điện** chuyển từ bộ nhớ sang world state phạm vi phòng → còn nguyên khi server khởi động lại; bỏ sự kiện `incense:new`.
- Test: `tests/world-state.test.mjs` (phạm vi không rò, xung đột version, hết hạn, còn sau restart, client không lùi version, delta đúng người qua Socket.IO). `npm test` 52/52.

### P2-2 — StoryEngine + DialogueEngine + trí nhớ NPC (xong phần engine; nội dung truyện ở P2-4)
- `server/services/narrative.js`: `loadNarrativeContent(dir)` + `validateContent` (lỗi tham chiếu nút/bước/vật phẩm bị chặn ngay khi khởi động); `createNarrative(...)`:
  - **Hội thoại**: đồ thị trong `server/content/dialogues/<npc>.json` — `entries` (mục vào đầu tiên thỏa điều kiện, mục cuối không điều kiện), `nodes` { lines (hoặc mảng các biến thể, chọn ngẫu nhiên), mood, choices[{id,text,when,next,remember,setFlags}], next, setFlags, startStory, log }. Điều kiện `when`: met, familiarity (tối thiểu), phase (buổi theo giờ server + TZ), weather (tính tất định như client), flags, notFlags, choices, notChoices, story (trạng thái/chương/bước), world (đọc WorldStateManager). Server giữ con trỏ nút cho từng socket → không nhảy cóc, không chọn được lựa chọn bị ẩn; mỗi người một phiên riêng.
  - **Quan hệ**: gặp lần đầu ghi `met_at`; mức quen biết +1 tối đa một lần/ngày trò chuyện và khi xong chương truyện của NPC đó; chỉ dùng để mở khóa nội dung (nhãn: Mới gặp → Tri kỷ), không có điểm hay quà bắt buộc.
  - **Câu chuyện**: `server/content/stories/*.json` (chưa có file — P2-4). Chương → bước, mỗi bước có `objective`, `hint`, `trigger` {dialogue|visit|activity|interact|practice|flag}, `setFlags`, `log`; phần thưởng chương (vật phẩm, cờ, world state) cấp phía server đúng một lần khi bước cuối hoàn tất; `story_log` lưu từng diễn biến để nhật ký kể lại. `state(player)` trả objectives + `highlights` (NPC đang có chuyện mới) + `talkers`.
- `server/sockets/narrative.js`: `dialogue:start {npcId}` (kiểm tra NPC ở cùng khu và khoảng cách), `dialogue:choose {choiceId}`, `dialogue:next`, `dialogue:end`, `story:state`; phát `story:update {story, chapters}`. Sự kiện `visit` (qua cổng) và `activity` (minigame) đã nối vào StoryEngine. REST `GET /api/stories` cho nhật ký.
- Nội dung mới: đồ thị hội thoại cho **An** (giới thiệu một lần, hỏi và nhớ chỗ yêu thích, lời theo buổi/mưa, bí mật khi đã quen), **Bác Lâm** (nhớ nhịp đi của người chơi, chuyện xưa khi đã quen), **Thầy Minh** (câu hỏi suy ngẫm có nhớ câu trả lời). Đổi tên: Bác Tâm → **Bác Lâm**, Thầy Tịnh → **Thầy Minh**, trụ trì Thầy Viên Minh → **Thầy Viên Giác**.
- Client: `DialoguePanel.openServer` (gõ chữ bỏ qua được bằng click/Enter/Space, tắt khi giảm chuyển động; lựa chọn bằng nút hoặc phím 1–9; chân dung đổi dòng biểu cảm theo `mood`); NPC có đồ thị trò chuyện qua server khi đang kết nối, ngoài ra dùng JSON cũ; chip mục tiêu câu chuyện (`#storyObjective`, bấm mở nhật ký); dấu "!" vàng cạnh tên NPC có chuyện mới; nhật ký có mục "Câu chuyện" (chương, diễn biến, việc tiếp theo, mức quen biết).
- Test: `tests/narrative.test.mjs` (phân nhánh, lựa chọn ẩn không ép được, nhớ lựa chọn, quen biết 1 lần/ngày, câu chuyện qua dialogue/visit/activity, thưởng một lần, world state từ chương truyện, nhật ký, nội dung lỗi bị chặn, hội thoại qua socket theo khoảng cách + nhớ sau reconnect). `npm test` **56/56**. Browser (Edge): chạm vào An → đi tới → hội thoại server, chọn bằng nút; lần sau An nhớ chỗ yêu thích; nhật ký hiện "Chú tiểu An: mới gặp"; console 0 lỗi.

### P2-3 — Lịch sinh hoạt NPC (xong)
- `public/js/shared/npcSchedule.js` (dùng chung client/server): `ROUTINE_MS` = 24 phút thật, 4 giờ (`ROUTINE_NAMES`: công phu sáng, chấp tác, học kinh, tịnh tọa); `ROUTINES` cho An, Bác Lâm, Thầy Minh (khu, tọa độ, tư thế, cử chỉ, hoạt động). `NpcDirector.stateAt(id, now)` là hàm thuần của đồng hồ server: đi bằng `Pathfinder` từ chỗ của giờ trước tới chỗ mới, qua các cổng theo BFS đồ thị khu, tốc độ 95px/s, cache theo (npc, giờ). Mọi máy tính ra cùng vị trí → không gửi vị trí NPC qua mạng; người vào muộn tự đúng.
- Bản đồ: object NPC đi lại có `"schedule": true` (vẫn giữ ngoại hình/lời/nhãn ở map nhà); `collidersFor` bỏ qua chúng (không thành vật cản vô hình ở chỗ cũ).
- Client: `Game.placeTravelers` mỗi khung hình đặt NPC theo `clockNow` (= `net.clock.now()`), đưa NPC đang ở khu hiện tại vào `scene.visitors` và `interactions.extra`; `Scene.npcs` = cư dân + khách. NPC đang trò chuyện với mình (`game.talkingTo`) được giữ nguyên chỗ tới khi đóng hội thoại. Bảng bản đồ (M) có "mọi người đang ở đâu".
- Server: `ctx.npcDirector`; `dialogue:start` kiểm tra NPC đi lại có ở cùng khu và đủ gần theo lịch (+80px dung sai); nếu không, báo NPC đang làm gì.
- Test `tests/npc-schedule.test.mjs`: mọi chỗ đứng đi được; mọi chặng có đường thật và lấy mẫu từng 8px không đụng vật cản; chặng đi < nửa giờ sinh hoạt; vị trí tất định, liên tục, đổi khu qua cổng. `npm test` 58/58. Browser: "Giờ học kinh" — An ở Tháp Chuông, trò chuyện được.


### P2-4 — Ba câu chuyện chơi trọn (xong)
- **Nội dung** `server/content/stories/`: `an-bell` (4 chương: trang nhật ký → hỏi thầy Minh + sổ ghi chép → hộc gỗ khắc sen ở Tháp Chuông, giải đố nụ → hé → nở → treo chuông ở cổng Tam Quan), `lam-garden` (3 chương: dọn góc vườn cũ → tìm hạt hoa dại ở Rừng Trúc, gieo → tưới tới khi nở), `minh-letters` (3 chương: lá thư trong hộp gỗ → phiến đá bên Hồ Sen → tự viết lá thư chưa gửi, chọn giữ hoặc thả theo gió). Nhánh truyện được thêm vào đồ thị `novice/gardener/librarian.json` (lời mời, lời chờ theo từng bước, lựa chọn "sau truyện" trong menu).
- **Vật thể truyện** (map object `action:"story"`, `narrative:true`, có đồ thị `kind:"object"` cùng id): `oldLedger`, `letterBox` (Thư Viện), `bellChest` (Tháp Chuông), `bellHook` (Cổng), `wildSeed` (Rừng Trúc), `lakeStone` (Hồ Sen). Hình vẽ ở `public/js/rendering/StoryProps.js` (gộp vào `PROPS`), collider ở `CollisionSystem`.
- **Góc vườn cũ** `oldGarden` (Vườn Thiền, `action:"restore"`) → `world:interact` → `worldActions.restore`: trạng thái phòng, ai trong phòng cũng góp tay được (kể cả người chưa nhận truyện), mỗi giai đoạn có số lượt và cooldown riêng, gieo hạt cần cờ `lam.seed`. 5 giai đoạn vẽ khác nhau (cỏ dại → đất → cây non → hoa tím → thêm đèn đá).
- **World state lên hình**: `Scene.onWorldState(record)` gắn giá trị vào `o.world[type]`, prop đọc ra (chuông treo khi `bellHook.hung`, giai đoạn vườn). Phần thưởng chương 4 của An đặt `room|gate|bellHook|hung = true` → cả phòng thấy chuông; móc chuông nói "chuông đang ngân" theo world state, không chỉ theo tiến độ riêng.
- **Client**: `case 'story'` → `dialogue.openServer(o)` (vật thể không có chân dung); `case 'restore'` → `restoreWork`; nút nhập liệu `view.input` (textarea + "Viết xong", ghi chú "chỉ mình bạn đọc được") → `dialogue:submit`; phím số không bị bắt khi đang gõ. Vườn riêng có thêm đồ trang trí `windbell` (cột chuông gió) và `wildflower`.
- **Sửa engine**: điều kiện `story: {chapter, step}` nay chỉ khớp khi truyện đang `active` (trước đó truyện đã xong vẫn khớp bước cuối, An cứ lặp lời cảm ơn).
- Test `tests/stories.test.mjs`: chơi trọn cả 3 câu chuyện qua socket thật với nội dung/bản đồ thật (đặt người chơi cạnh vật cần tới; NPC lưu động được ghim cạnh người chơi). Kiểm: thứ tự giải đố sai bật lại, chuông treo cho cả phòng, phần thưởng riêng từng người, vườn có người giúp không nhận truyện, chặn gieo khi chưa có hạt, người khác hoàn thiện vườn, lá thư lưu thành ghi chú nhật ký riêng, cờ kết thúc. `npm test` **61/61**, `npm run check` 125 file. Browser (Edge): hội thoại móc sắt (không chân dung), chuông đồng treo dưới mái cổng, ô viết thư, góc vườn giai đoạn 0/2/4, dấu "!" trên Bác Lâm, console 0 lỗi.

### P2-5 — Chơi hợp tác (xong)
- **Migration v5**: `coop_sessions` (kết quả từng phiên: phòng, loại, chủ/khách, trạng thái, result JSON, thời gian) + `shared_memories` (kỷ niệm của từng người). Phiên đang chạy chỉ ở bộ nhớ. Thành tựu mới trong `seed.js`: `coop-tea`, `coop-bell`, `coop-meditation`, `coop-garden`, `coop-puzzle` (thưởng `badge:twoKeys`).
- **`server/services/coop.js` — CooperativeSessionManager**: `invite / respond / ready / unready / act / leave / away / back / sceneChanged / sweep`. Vòng đời `invited → gathering → active → completed | cancelled`, hoặc `declined | expired`. Chống spam: 1 phiên/người, chờ 6 giây giữa hai lời mời (`LIMITS`), bị từ chối thì 60 giây không mời lại người đó được, lời mời hết hạn sau 60 giây. Chỉ mời được người cùng phòng; chặn nếu một bên đã ẩn bên kia. Mất kết nối thì phiên tạm dừng (`graceMs` = `disconnectGraceMs`), vào lại kịp thì nhận lại phiên qua `room:join` (`coop`), quá hạn thì hủy. Rời khu trong lúc chơi hoạt động `stay` thì hủy nhẹ nhàng cho cả hai. Mỗi bước do server kiểm vai, thứ tự và vị trí; client không thể gửi "hoàn thành". Node xử lý tuần tự từng yêu cầu nên hai người bấm cùng lúc vẫn chỉ được áp dụng lần lượt. Trạng thái công khai của phiên ghi vào world state phòng (`<object>/coop`) để người xung quanh cũng thấy.
- **`server/services/coopActivities.js`**:
  - **Bàn trà** (`teaForTwo`, Vườn Thiền): chọn trà (chủ) → bày chén (khách) → rót (chủ) → cả hai nâng chén → chủ đề trò chuyện (chỉ hai người thấy) → đặt chén.
  - **Thiền chung**: hai bồ đoàn `zen1/zen2`; hai người phải chọn cùng thời lượng 3/5/10/15 phút; dùng lại phiên thiền có sẵn (`hooks.startMeditation`, `shared`); đồng hồ server; ai kết thúc sớm thì người kia ngồi tiếp, không bị phạt.
  - **Cùng thỉnh chuông**: chuẩn bị (chủ) → xác nhận (khách) → ba hơi thở → cùng bấm trong cửa sổ ±1,5 giây. Lỡ nhịp thì chờ vòng sau, không có điểm. Dùng lại phát `bell:ring` và chỉ số.
  - **Cùng làm vườn**: dùng góc vườn cũ; mỗi người một việc (`ROLE_TASKS`); cả hai cùng làm trong 30 giây thì mỗi lượt tính gấp đôi; lưu số lượt góp của từng người.
  - **Câu đố ký hiệu**: lời giải ngẫu nhiên mỗi phiên (`makeSecret`). Cuộn giấy ở Thư Viện cho thứ tự theo tính chất (một mình thì mơ hồ); phiến đá ở Tháp Chuông cho biết ba ký hiệu được khắc; hai trụ đèn phải do hai người khác nhau đặt trong vòng 12 giây. Sai hai lần thì An gợi ý ký hiệu đầu. Có chế độ một mình (40 giây). Giải xong mở hốc trên phiến đá cho cả phòng.
  - **Cử chỉ nhanh** (`greet`, `sit`, `photo`): phải đứng gần nhau và người kia đồng ý. Mỗi client tự di chuyển nhân vật của mình; ảnh chụp lưu trên máy từng người.
- **Socket** `server/sockets/coop.js`: `coop:invite/respond/ready/unready/act/leave/state/memories`, kiểm schema, rate limit `coop`, luôn có ack. Server gửi `coop:invite/state/complete/sit/photo`, `meditation:begin`.
- **Client** `public/js/ui/CoopPanel.js`: thẻ bên phải (trên mobile ở dưới), gồm thẻ lời mời Đồng ý/Từ chối, chọn người/hoạt động, hướng dẫn từng bước theo vai, nút hành động, vòng thở khi thỉnh chuông, chọn ký hiệu cho trụ đèn, khoảnh khắc kết thúc (đom đóm, cánh hoa, chuông). "Mọi người" → "Cùng chơi" để mời. Vật thể mới `teaForTwo`, `clueScroll`, `symbolStone`, `dialLeft/Right`. Nhật ký có mục "Kỷ niệm chung" (`/api/stories` trả thêm `memories`).
- Test `tests/coop.test.mjs` (8 test, nhiều client Socket.IO thật): mời/đồng ý/từ chối/hủy/spam/khác phòng/đã ẩn; trà đúng vai + thưởng một lần; mất kết nối → vào lại tiếp tục → quá hạn thì hủy; rời khu; chuông theo nhịp; thiền chung (lệch thời lượng, cùng đồng hồ, rời sớm); vườn chung gấp đôi; câu đố (200 lời giải sinh ngẫu nhiên đều chỉ có một đáp án, một người không đặt được cả hai trụ, gợi ý, chơi một mình, huy hiệu một lần); cử chỉ. `npm test` **69/69**.
- Browser (Edge, 2 context thật):
  - Mai mời Bình qua "Mọi người" → Bình thấy thẻ lời mời → đồng ý;
  - hai người ngồi đối diện ở bàn trà, đi đủ các bước, có hơi nước và chén trà; kỷ niệm hiện trong Nhật ký;
  - đi tới Tháp Chuông, thở theo vòng sáng, cả hai bấm "Thỉnh" đúng nhịp → chuông ngân;
  - giao diện chọn ký hiệu cho trụ đèn hiển thị đúng;
  - console 0 lỗi.

### P2-6 — Thế giới phản ứng + chuỗi lâu dài A (xong; chuỗi B làm cùng P2-7)
- **Phản ứng tức thì khi thỉnh chuông** (mọi người trong khu đều nhận `bell:ring`): `Scene.react('bell', bell)` cho chim bay lên từ cây gần đó (particle `bird`), đèn lồng treo đung đưa mạnh hơn (`env.ring` giảm dần từ 1 về 0 trong 5 giây, đọc ở `drawHangingLantern`), NPC gần đó quay sang nhìn (`NPC.look`). Chế độ giảm hiệu ứng dùng ít chim hơn.
- **Hoa đăng**: thêm vệt phản chiếu ánh lửa lăn tăn trên mặt nước (`LotusLakeScene.drawWater`).
- **Sân chùa trong phiên** (`worldActions` → dự án `courtyard`, key `room|courtyard|yard|restoration`, ttl 2 giờ kể từ lần thay đổi cuối):
  - Trạng thái: DIRTY 0 → CLEANING 1 → CLEAN 2 (quét 6 đống lá `pile1–6`, gom vào xe `leafCart`, lau bể `stoneBasin`) → DECORATED 3 (`decorLeft/Right`).
  - Khi đã trang trí thì mở tương tác mới: dây đèn lồng `lanternSwitch` (bật/tắt, có ánh sáng động).
  - Mỗi thao tác được kiểm theo giai đoạn, cập nhật nguyên tử, một đống lá chỉ tính một lần.
  - Khi An đang ở sân và ở gần, An reo (bong bóng chat). Lời của An đổi theo giai đoạn sân (`yard-cleaning/clean/decorated`).
  - Cảnh thay đổi thật: đống lá biến mất, xe đầy lá, bể sáng, chậu hoa và đèn xuất hiện, lá rơi thưa hẳn khi sân sạch.
- **Hạ tầng client**:
  - `Scene.onWorldState` cũng áp vào vật có `stateOf` (các vật của sân đọc chung trạng thái `yard`).
  - `HIDDEN` (trong `StoryProps.js`) quyết định vật nào ẩn/hiện theo trạng thái, tính ngay khi tạo khu. Vật ẩn không vẽ và `InteractionSystem` bỏ qua.
  - Vật thay đổi theo trạng thái đều là `solid:false`, để collision ở server và client luôn khớp.
- **Chuỗi A — vườn hồi sinh**, mỗi giai đoạn có:
  - vật thể/cảnh quan riêng (đã có từ P2-4);
  - hiệu ứng: cỏ lay, lá non; bướm khi nở hoa (particle `butterfly`); đèn đá phát sáng khi hoàn chỉnh (`dynamicLights`);
  - lời Bác Lâm riêng cho từng giai đoạn (`garden-stage-1..4`, nhờ điều kiện `world` mới hỗ trợ `field`);
  - một tương tác: dọn → gieo → tưới → trang trí → ghế `oldGardenBench` xuất hiện để ngồi ngắm.
- Test `tests/world-react.test.mjs`:
  - dọn sân bằng 2 client: luật từng bước; người kia nhận delta; một đống lá chỉ tính một lần; người vào sau nhận snapshot đúng; phòng khác không thấy; hết hạn thì sạch trạng thái;
  - hội thoại NPC theo world state;
  - restart server với file SQLite: vườn và chuông vẫn còn, trạng thái tạm thì đã hết hạn.
  - `npm test` **72/72**.
- Browser (Edge, 2 context):
  - Mai quét → Bình thấy đống lá biến mất ngay; reload vẫn giữ;
  - dọn hết, trang trí, thắp dây đèn → sân đổi hẳn;
  - Bình thỉnh chuông sân → Mai nhận thông báo, 8 con chim bay lên, đèn đung đưa;
  - console 0 lỗi.

### P2-7 — Hành trình "Ánh sáng trong Chánh điện" + chuỗi lâu dài B (xong)
- **Nội dung** `server/content/stories/light-hall.json` (`journey: true`, 5 chương = 5 giai đoạn, kèm `finale` và `teaser` gợi ý chương sau):
  1. An mời (hỏi về đèn hoặc lịch sử chùa, nhận lời, hoặc "để lúc khác" — có thể quay lại qua menu);
  2. hỏi thầy Minh → cuốn sách `oldBook` (Thư Viện): bốn trang vẽ đèn đồng, chỉ trang 27 khớp lời An tả "chân sen, ba áng mây"; trang đó ghi "hốc tường thứ ba, đếm từ tượng Phật sang bên phải";
  3. chuẩn bị Chánh Điện bằng hai trong ba việc (dâng hoa / thắp nến / đọc suy ngẫm, cờ `hall.prepared`), rồi tìm đúng hốc `nicheC` (hai hốc kia chỉ có bụi);
  4. hoạt động hợp tác `lamp`;
  5. kể với An → nhận `badge:hallLight` và `decor:hallLamp` (đặt được ở vườn riêng).
  - Lời mời vào hành trình của An được ưu tiên trước truyện chuông (người mới gặp hành trình đầu tiên trước).
  - Không bắt buộc lạy 108 lần hay thiền lâu.
- **Chánh Điện** (`server/services/hallActions.js`, gọi qua `world:interact {objectId, choice}`):
  - **dâng hoa:** 4 loại; trạng thái phòng `flowerTable/vases`, giữ 6 giờ, tối đa 8 bình;
  - **giá 9 ngọn nến:** thắp hoặc dập nến của mình; cháy 15 phút theo đồng hồ server, cháy hết thì hiện nến tàn; có ánh sáng động;
  - **kệ suy ngẫm:** 6 đoạn ngắn do game tự viết, ghi rõ không trích kinh.
  - Bố cục: bàn gỗ phủ khăn bên trái; ba hốc tường bên phải tượng Phật (chuyển từ bên trái sang vì khung mục tiêu che mất hốc thứ ba).
- **Hoạt động `lamp`** (`coopActivities.js`):
  - **Bắt đầu:** chỉ người đang ở giai đoạn 4 mới mở được.
  - **Hai người:** người chuẩn bị lau đèn trong lúc người tìm chỗ mở nắp hốc. Người tìm soi dấu khắc ngẫu nhiên (chỉ người đó thấy) và báo lại; người chuẩn bị xoay đế cho khớp (sai thì thử lại), mang đèn tới hốc, rồi hai người cùng thắp trong vòng 10 giây.
  - **Một mình:** An làm người tìm chỗ; người chơi phải tự đến soi dấu trước khi xoay đế.
  - **Kết quả:** đèn sáng là trạng thái **cá nhân** của mỗi người tham gia (`personal|mainHall|ancientLamp|state`), nên không làm hỏng hành trình của người khác. Người giúp không bị ghi tiến độ hành trình. Hoàn thành thì gửi sự kiện truyện `{type:'coop', kind}` (trigger mới `coop`).
- **JourneyDirector** (`server/services/journey.js`), dựa trên StoryEngine nên có sẵn checkpoint, tiếp tục sau reload, cập nhật thế giới và phần thưởng. Thêm:
  - **thời gian chủ động** theo giai đoạn: chỉ cộng các khoảng dưới 90 giây giữa hai lần di chuyển hoặc sự kiện truyện; giữ trong bộ nhớ;
  - **tạm dừng / tiếp tục:** `journey:pause` ẩn mục tiêu và ngừng tính giờ;
  - **thẻ giới thiệu giai đoạn chỉ hiện một lần:** `journey:seen`, lưu trong cờ;
  - **telemetry riêng tư:** migration **v6** `journey_events`, gồm khóa người chơi băm một chiều 16 ký tự, tên sự kiện, số giai đoạn, số giây, cờ solo. Không có tên, chat, lời viết hay lời nguyện. Sự kiện: started, stage_completed, completed, coop_started/completed:<kind>; số người bỏ dở (không hoạt động quá 3 ngày) được tính khi thống kê.
- **Thống kê cho chủ dự án:** đặt biến môi trường `OWNER_TOKEN` rồi gọi `curl -H "x-owner-token: $OWNER_TOKEN" http://localhost:43127/api/owner/journey`. Kết quả gồm số bắt đầu/hoàn thành/đang chơi/bỏ dở, tỷ lệ hoàn thành, trung vị phút chủ động và phút thực tế, số người tới từng giai đoạn, bỏ dở trước giai đoạn nào, tỷ lệ chơi cùng bạn. Không đặt token thì endpoint trả 404.
- **UI** (`main.js`, `HallPanel.js`):
  - khung mục tiêu ghi "Hành trình · Giai đoạn n/5", có nút tạm dừng;
  - gợi ý chỉ hiện sau 2,5 phút không có tiến triển;
  - thẻ giới thiệu giai đoạn tự mờ sau 6 giây, chạm để đóng;
  - khoảnh khắc kết thúc là hộp thoại có đoạn kết, quà kỷ niệm và gợi ý chương sau, kèm âm chuông và hợp âm;
  - Chánh Điện sáng ấm hơn khi đèn đã thắp.
  - Đã sửa lỗi có từ trước: hai phần tử cùng `id="storyText"` khiến bảng đọc truyện ở Thư Viện ghi nhầm vào khung mục tiêu (khung mục tiêu giờ dùng `storyGoal`). Tiêu đề dùng Palatino vì Georgia không có chữ "ố".
- Test `tests/journey.test.mjs`:
  - **chơi một mình cả 5 giai đoạn:** chọn sai trang, sai hốc, sai dấu đều bị từ chối; phải soi dấu trước khi xoay; có đoạn kết và gợi ý chương sau; không nhận thưởng lần hai; chơi lại có lời mới;
  - **thống kê:** sai token thì 403; số liệu đúng; không lộ tên người chơi;
  - **chơi cùng bạn:** reload giữa chừng vẫn đúng giai đoạn; tạm dừng/tiếp tục và `seen`; người không ở giai đoạn 4 không mở được; vai được kiểm; người giúp không bị ghi tiến độ; cả hai thấy đèn sáng; telemetry ghi lần chơi chung.
  - `npm test` **74/74**.
- Browser (Edge):
  - gặp An → hỏi về đèn → nhận lời → khung mục tiêu sang giai đoạn 2/5, thẻ giới thiệu giai đoạn hiện ra;
  - dâng hoa sen và thắp nến qua `HallPanel` (nến cháy trên giá);
  - bố cục mới thấy rõ ba hốc tường, đèn sáng trong hốc thứ ba;
  - console 0 lỗi.
- **Chưa đo:** chưa có playtest thật với người chơi mới, nên thời lượng 15–25 phút mới là **thời lượng thiết kế**, chưa phải số đo. Số đo thật sẽ có trong `/api/owner/journey` khi có người chơi.

### P2-8 — Chánh Điện nâng cao (xong phần mã + test tự động; một số phần chưa thử trên trình duyệt)
- **Migration v7**:
  - `practice_sessions`: phiên lạy, gồm mục tiêu, số đã lạy, trạng thái active/paused/completed/ended;
  - `reading_marks`: vị trí đọc và dấu trang theo từng bài;
  - `wishes.kind`: sổ cầu nguyện dùng lại bảng lời chúc với `kind = 'prayer'`.
  - Repository mới: `server/repositories/practice.js`.
- **Bố cục Chánh Điện** (`public/data/maps/mainHall.json`):
  - bên trái: bàn gỗ đặt đèn cổ (`lampTable`), giá nến (`candleRack`), góc đọc (`readingDesk`);
  - bên phải tượng Phật: ba hốc tường (`nicheA/B/C`);
  - bên phải gian: bàn lấy hoa (`flowerTable`), kệ suy ngẫm (`reflectStand`), sổ cầu nguyện (`prayerBook`);
  - trên bàn thờ: bình hoa (`altarVases`).
  - Bồ đoàn lạy nay mở bảng chọn phiên (`bowSession`), chỗ lần hạt mở vòng 108 hạt (`beads`).
  - Vật mới đều có collider khớp giữa server và client.
- **Lạy Phật:**
  - phiên 9/27/54/108 qua `practice:session {action: start|pause|resume|end}`;
  - chỉ tính khi `practice:complete` hợp lệ: đủ thời gian động tác và đứng yên, nên spam sự kiện không tăng số;
  - tạm dừng thì lần lạy vẫn tính vào vòng 108 nhưng không tính vào phiên; vào lại phòng thì nhận lại phiên qua `room:join` (`practice`);
  - phản hồi nhẹ sau mỗi lần, chuông lớn khi trọn phiên; không có bảng xếp hạng.
  - Động tác 3,6 giây gồm 24 khung hình: chắp tay → quỳ → cúi sát sàn → về quỳ → đứng (`bowPhases` trong `CharacterArt.js`; `SpriteRenderer` dùng `FRAMES_BY_STATE`). `DURATIONS.bow` = 3.6, dùng chung cho server.
  - Client (`BowSession` trong `public/js/ui/HallPractice.js`) tự lạy theo nhịp, nghỉ 1,2 giây giữa hai lần. Thẻ phiên vẫn hiện trong chế độ tập trung (`body.focus` ẩn HUD).
- **Chuỗi 108 hạt** (`BeadRing`): vòng hạt vẽ trên canvas, hạt hiện tại ở trên cùng và nổi bật, xoay một hạt mỗi lần, có hạt chủ và tua đỏ; dùng phím cách / Enter / chuột / chạm; mỗi động tác chỉ đi một hạt; tròn vòng thì có chuông; tiến độ vẫn là `beadsRound`.
- **Trình đọc** (`ReadingPanel`):
  - 13 bài có sẵn trong `public/data/stories.json` (diễn ý hoặc kể lại, ghi nguồn), tách đoạn bằng `public/js/shared/reading.js` (dùng chung client/server);
  - chỉnh cỡ chữ, đọc từng đoạn, làm nổi đoạn đang đọc, tự lật (tắt/chậm/vừa/nhanh);
  - lưu vị trí và dấu trang qua `GET/PUT /api/reading` (server kiểm bài có tồn tại, vị trí nằm trong phạm vi, tối đa 20 dấu trang);
  - giải thích thuật ngữ trong `public/data/glossary.json`: lời mô tả do game tự viết, không trích kinh;
  - **nghe đọc chưa triển khai** vì chưa có bản thu được cấp phép; giao diện ghi rõ điều này, không có nút giả.
- **Dâng hoa:** lấy hoa ở bàn hoa (server ghi lại người đang cầm hoa, hiệu lực 3 phút, client vẽ cành hoa trên tay) → tự đi tới `altarVases` → đặt hoa. Hoa hiện trong bình trên bàn thờ cho cả phòng (trạng thái phòng, 6 giờ, tối đa 8 bình). Nếu Thầy Viên Giác ở gần thì thầy nói một câu.
- **Thắp nến:** chọn vị trí (`light:N`; chỗ đã có nến thì bị từ chối), hoặc dập nến của chính mình. Trạng thái tắt / đang cháy / đã tàn tính theo đồng hồ server; có ánh sáng động.
- **Sổ cầu nguyện** (`PrayerBook`, dùng hệ thống lời chúc):
  - mặc định riêng tư, chỉ công khai khi người viết chọn; tối đa 300 ký tự; giữ nguyên kiểm từ ngữ và thời gian chờ;
  - `DELETE /api/wishes/:id` chỉ tác giả xóa được; lời công khai bị xóa cũng biến mất với cả phòng;
  - vẫn báo cáo được; lời nguyện không lẫn vào bảng lời chúc; chỉ dùng `textContent`.
- **Nghi thức chung:**
  - thiền chung nay ngồi được ở bồ đoàn Chánh Điện; hai người phải ở cùng một khu;
  - **cùng đọc** (hoạt động `read`): mời từ danh sách bài đọc, cả hai thấy cùng một đoạn, ai cũng lật được, đọc xong để lại kỷ niệm;
  - cùng thắp đèn cổ đã có từ P2-7.
- **Đèn cổ — 5 trạng thái** (trạng thái thế giới cá nhân `ancientLamp`), bàn đèn và hốc tường vẽ theo:
  1. chưa khám phá: phủ khăn;
  2. có manh mối (xong giai đoạn 2): ánh lấp lánh dưới khăn;
  3. đang chuẩn bị (xong giai đoạn 3): khăn được vén, lộ đèn;
  4. đã khôi phục: đèn nằm trong hốc;
  5. đang tỏa sáng: có lửa, Chánh Điện sáng ấm hơn.
- **Thiền nâng cao:** âm thanh thiên nhiên (mưa / suối / gió, tổng hợp bằng Web Audio), thanh chỉnh âm lượng, tùy chọn chuông kết thúc, cảnh tối và dịu màu dần khi thiền (`filter`, không nhấp nháy). Thoát được bất cứ lúc nào như trước.
- **Âm thanh / hiệu ứng:** tiếng bước trên sàn gỗ ở khu trong nhà, bụi sáng lơ lửng trước bàn thờ (tắt khi giảm hiệu ứng). Không thêm audio thu sẵn nào.
- Test `tests/hall.test.mjs` (5 test):
  - phiên lạy: chặn spam, chặn lạy chưa trọn, tạm dừng, vào lại, trọn phiên, kết thúc sớm;
  - vị trí đọc và dấu trang được kiểm hợp lệ;
  - lời nguyện riêng tư không lộ ra cho người khác; xóa và báo cáo; tách khỏi bảng lời chúc;
  - hoa người khác cũng thấy; nến theo vị trí, chỉ dập được nến của mình;
  - cùng đọc; thiền chung ở Chánh Điện, ở hai khu khác nhau thì bị từ chối.
  - `npm test` **79/79**.
- **Browser (Edge):**
  - phiên 9 lạy chạy theo nhịp; đã chụp lúc đang quỳ cúi lạy; thẻ phiên hiển thị đúng;
  - vòng hạt lần 3 hạt đúng;
  - trình đọc đánh dấu trang, tải lại vẫn mở đúng đoạn;
  - dâng hoa lan: tự đi tới bàn thờ, hoa hiện trong bình;
  - console 0 lỗi.
- **Lỗi phát hiện khi kiểm trên trình duyệt (đã sửa):**
  - lấy hoa làm server lỗi khi người chơi đang có truyện chạy (`handle(undefined)`); test đã bổ sung trường hợp này;
  - trình đọc cuộn cả khung bảng làm khuất tiêu đề.
- **Kiểm thủ công sau khi merge `b7b31f9`** (gộp Parse 2 với nhánh cải tiến cảnh / cho cá ăn / nhạc ngoài trời / popup theo khu của chủ dự án). `npm test` **90/90** (thêm các test của nhánh kia). Edge, 2 context thật:
  - **chọn vị trí nến:** thắp chỗ 3 → chỗ đó bị khóa và hiện nến đang cháy;
  - **sổ cầu nguyện:** lời riêng tư chỉ tác giả thấy; lời công khai người kia thấy; tác giả xóa xong thì người kia không còn thấy; không lẫn vào bảng lời chúc;
  - **cùng đọc:** mời từ danh sách bài → đồng ý → sẵn sàng; người kia lật trang thì màn hình mình cũng sang trang; đọc tới đoạn cuối → gấp sách → hai bên đều có kỷ niệm;
  - **thiền chung trên bồ đoàn Chánh Điện:** chung đồng hồ, HUD ẩn; một người kết thúc sớm thì người kia vẫn ngồi và nhận thông báo, người dừng vẫn được lưu thời gian;
  - **âm thanh thiên nhiên:** bật khi thiền, tắt khi xong; thanh âm lượng hoạt động;
  - **tiếng bước gỗ:** chỉ xác nhận được ở mức mã (`step('wood')` trong khu trong nhà), không nghe được trong môi trường kiểm thử;
  - **điện thoại (412×915):** bảng chuỗi hạt và thẻ phiên lạy dùng được; tải lại trang thì phiên lạy vẫn đếm tiếp;
  - **lướt lại cảnh sau merge:** sân chùa, Vườn Thiền và Chánh Điện vẫn hiện đủ vật thể của Parse 2; console 0 lỗi.
- **Đã sửa trong đợt này:**
  1. thẻ phiên lạy trên điện thoại chiếm gần nửa màn hình và che nhân vật → thu thành hai dòng, nút không xuống dòng;
  2. thanh âm lượng trong bảng thiền không lưu và lệch với bảng Cài đặt → nay lưu chung `sanmay-volumes` và hai thanh tương ứng bên Cài đặt cập nhật theo;
  3. câu hướng dẫn thiền chung nói "hơi thở của hai người hiện thành vòng sáng" không đúng với hình ảnh thật → sửa lại;
  4. chuyển khu trong lúc chờ server mở hội thoại thì cuộc trò chuyện bị bỏ dở mà vẫn mở phía server → nay tự `dialogue:end`, không đụng tới cuộc trò chuyện mới hơn;
  5. chuyển khu khi đang cầm hoa, hoặc đang mở danh sách người để mời → nay bỏ cành hoa và đóng danh sách (`coop.closePicker`).
- **Còn lại:** chưa có playtest với người chơi thật cho hành trình 20 phút (thời lượng thật sẽ có trong `/api/owner/journey`); chưa nghe thử âm thanh trên thiết bị thật.

## Đọc trước khi sửa

1. `README.md` (chạy, kiến trúc) rồi các mục M1–M5 ở trên.
2. `npm install`, `npm run check`, `npm test` để xác nhận baseline (79/79).
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

## Visual Polish 3.0 — C0/C1 (2026-11-03)

- Branch: `feature/visual-polish-3`; baseline HEAD `acf75c4dabc5551e57b90cfa81c10a6be62f5fad`.
- C0: source audit và regression baseline đã ghi ở `docs/visual-polish/`; `npm.cmd run check` đạt 161 JavaScript files, `npm.cmd test` đạt 96/96.
- C1: thêm `public/css/tokens.css`, nạp trước stylesheet chính và chuyển các surface chung của HUD/panels sang token; bổ sung style guide và schematic style board.
- Browser screenshot/FPS/mobile visual QA là `NOT RUN`: browser automation kernel không khởi tạo được và không có browser executable/Playwright khả dụng. C1 screenshot acceptance còn pending.
- Không có thay đổi gameplay, map, server, DB hay protocol. Chi tiết file và rollback: `docs/visual-polish/HANDOFF.md`.

## Visual Polish 3.0 — C2–C4 (2026-11-03)

- C2 shared art: refined stone-path surface and layered tree crowns, without touching map coordinates/colliders.
- C3 character: small idle hand sway in existing sprite frames; no action/business logic changes.
- C4 mobile UI: safe areas, horizontal action-strip scrolling alongside joystick, touch targets, viewport-constrained dialogs/panels.
- `npm.cmd run check` PASS (161 files), `npm.cmd test` PASS (96 tests), `git diff --check` PASS. Browser screenshots and visual matrix remain NOT RUN; see `docs/visual-polish/QA_REPORT.md`.

## Visual Polish 3.0 — C5–C7 (2026-11-03)

- C5 reused existing weather-aware audio, mute/volume controls and quality/reduced-effects settings; reduced-motion now stabilizes portal markers, water ripples and fog.
- C6 avoids resetting canvas backing dimensions on duplicate unchanged resize events. FPS improvement is not measured or claimed.
- C7: QA/performance/handoff updated. `npm.cmd run check` passed (161 files); `npm.cmd test` passed (96/96); browser visual QA and FPS remain NOT RUN.
- Local commit: `71c4659` on `feature/visual-polish-3` (not pushed). Overall status: **PARTIAL** pending browser screenshots, responsive visual review and benchmark. Detailed record: `docs/visual-polish/QA_REPORT.md`.

## Cập nhật gần nhất — quán chay, xu và móc chuông (2026-11-03)

- Cổng Tam Quan có quán chay với số ghế cố định theo bàn. Người chơi chọn ghế hoặc chạm bàn để lấy ghế trống; gọi một món, Cô Hạnh chuẩn bị rồi mang ra. Có thể đóng popup mà vẫn ngồi; nút HUD riêng dùng để đứng dậy. Bàn chỉ được lau sau khi khách đã dùng món và rời đi.
- Tiền trong game hiển thị bằng số và icon xu tự vẽ. Mỗi ngày nhận 300 xu; giá mua và giá món ăn giữ nguyên. Icon đặt sau số, không dùng emoji hay chữ “đồng” trên giá.
- Khách trang trí ngẫu nhiên tăng từ 8 lên 16; chỉ tồn tại phía client, không tính vào danh sách người chơi hoặc lưu trữ.
- Móc treo chuông gió dưới mái cổng được vẽ rõ và đặt ở lớp trước cổng; chuông xuất hiện sau khi hoàn thành đoạn truyện của An.
- Đã sửa một số hiệu ứng hình ảnh/âm thanh và tương tác ở cổng, sân chùa, Chánh Điện theo thay đổi trong commit đi kèm.
- Kiểm tra trong phiên này: `git diff --check` đạt. Chưa chạy test hoặc QA trình duyệt.
