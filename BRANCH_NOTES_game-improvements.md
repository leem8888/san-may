# Ghi chú nhánh phụ — feature/game-improvements

Cập nhật: 02/11/2026 (Asia/Bangkok).

## Phạm vi và bản nền

- Nhánh phụ: `feature/game-improvements`.
- Đã nhận `main` tới commit `075b455`.
- Các tính năng ở commit `a079e97` đã có trên bản nền, không triển khai lại khi merge.
- Những thay đổi dưới đây hiện nằm trong working tree, chưa commit/push.
- `main` đang triển khai `IMPLEMENTATION_Parse2.md`. File này ghi riêng công việc nhánh phụ; không dùng thay thế kế hoạch hoặc nhật ký Parse 2.

## Đã thực hiện trên nhánh phụ

| Phần | Hành vi hiện tại | File chính |
| --- | --- | --- |
| Cổng và sân phía sau | Sân đá rộng phía sau cả bức tường, hành lang và bóng Chánh Điện; cảnh qua ba cửa dùng chung phối cảnh. Giới hạn lớp sân để không che tường/nóc tường. | `rendering/GateCourtyardView.js`, `rendering/GateArt.js` |
| Sân trước cổng | Đường giữa rộng hơn, vườn hoa bên trái; quầy hương/mâm lễ/thức ăn cá ở **bên phải**, tọa độ **1120, 860**, có lối nhánh riêng. Giữ vị trí An và cổng chuyển khu. | `public/data/maps/gate.json`, `rendering/OfferingArt.js`, `ui/ShopPanel.js` |
| Mua thức ăn cá | SKU `fishFood`, giá 5 điểm/túi, dùng ví và túi đồ đã có; không thêm migration. Không cho dâng thức ăn cá như mâm lễ. | `shared/shop.js`, `ui/ShopPanel.js`, `server/repositories/shop.js`, `server/sockets/shop.js` |
| Cho cá ăn | Điểm `fishFeeder` tại Hồ Sen (1120, 970), thức ăn rơi vào nước tại (1100, 865). Trừ 1 túi, hạt bay, cá tụ lại rồi bơi ra, gợn nước. Đồng bộ trong phòng, người vào sau nhận hiệu ứng còn hạn. | `server/sockets/fishFeeding.js`, `shared/fishFeeding.js`, `rendering/FishFeedingArt.js`, `rendering/FishArt.js`, `scenes/LotusLakeScene.js` |
| Nhân vật trang trí | Đúng 8 người: Thanh Mai, Gia Huy, Ngọc Linh, Tuệ Nhi, Hoài Nam, Khánh Vy, Đức Sơn, Bảo Ngân. Tên giữ nguyên khi đổi khu; bản đồ/ngoại hình/cử chỉ/đường đi ngẫu nhiên. Thỉnh thoảng chat theo khu (6 giây, không lặp câu liên tiếp) hoặc hiện icon (2,6 giây). Hiển thị riêng từng máy, không có trong danh sách online hay tiến trình. | `entities/AmbientVisitors.js`, `core/Game.js`, `rendering/SceneRenderer.js` |
| Tháp Chuông | Làm đẹp mặt sân, hoa, đèn; chỉnh độ rung chuông, dùi và sóng âm. Giữ luật thỉnh chuông, cooldown và tọa độ tương tác. | `public/data/maps/bellTower.json`, `rendering/props.js` |
| Hồ Sen và cây | Lá sen có gân/khía, nụ và hoa nở phân biệt rõ; thêm cây/hoa trang trí, chi tiết hoa trên cây. | `rendering/LotusArt.js`, `rendering/ground.js`, `rendering/TreeArt.js`, `public/data/maps/lotusLake.json` |
| Vườn Thiền | Luống rau và dương xỉ **trang trí**, chưa có trồng/thu hoạch hay NPC chăm rau. | `rendering/SceneryPolish.js`, `public/data/maps/zenGarden.json` |
| Rừng Trúc | Thêm dương xỉ và bụi sáng ban ngày; giữ hệ trúc và lối đi. | `public/data/maps/bambooForest.json`, `scenes/BambooForestScene.js` |
| Pha trà | Vẽ lại nền, cửa sổ, khay, ấm chén, hơi nước, hướng dẫn các bước và thước mức trà. Không đổi luật đun/rót/hoàn thành. | `rendering/TeaArt.js`, `ui/minigames/TeaGame.js` |
| Thư viện | Thảm, cửa sổ, sách xếp; chưa thêm chức năng ngồi đọc hoặc sách phân trang. | `rendering/SceneryPolish.js`, `public/data/maps/library.json` |
| Chữ | Thống nhất các phông Canvas/CSS về Arial/Segoe UI, tăng chữ tên/chat, chuẩn hóa NFC trong helper tạo chữ. Quét nội dung chưa thấy dấu hiệu lỗi mã hóa UTF-8. | `public/css/*.css`, `rendering/SpriteRenderer.js`, `ui/dom.js` và các renderer có chữ |
| Ngoại hình nhân vật | Vẽ lại trụ trì với mặt cao tuổi hiền, mặt nghiêng rõ, áo cà sa cong mềm màu trầm và tích trượng mảnh. Nhân vật thường có sắc độ da và dáng áo mềm hơn. Chỉ sửa hình ảnh, không thay thời lượng/pha tu tập hay lịch NPC. | `rendering/AbbotArt.js`, `rendering/MonkArt.js`, `rendering/CharacterArt.js` |
| Popup theo bản đồ | Đổi scene tự đóng bảng bên, hội thoại, minigame và menu; bỏ focus chat mobile. Hội thoại tải chậm không mở lại ở map mới. Cùng map chỉ sửa vị trí không tự đóng popup. | `ui/ScenePopups.js`, `ui/DialoguePanel.js`, `core/Game.js`, `main.js` |

Các đường dẫn rút gọn `rendering/`, `scenes/`, `shared/`, `entities/`, `core/`, `ui/` nằm trong `public/js/`.

## Bàn trà nhìn từ cảnh thư viện

- `rendering/LibraryTeaArt.js`, hook `teaTable` trong `rendering/props.js`: bàn gỗ có vân, chân và yếm bàn; khăn dệt, khay tre, ấm men ngọc có quai/vòi/nắp, 3 chén trà, khăn gấp, thìa trà và hơi nước nhẹ. Giảm chuyển động sẽ tắt hơi nước.
- Chỉ thay hình ảnh ngoài cảnh, giữ tọa độ, collision, bán kính tương tác và logic pha trà/hợp tác của main. Không đổi popup pha trà.
- Syntax/JSON đạt 128 file JavaScript; kiểm tra renderer qua chu kỳ hơi nước và chế độ giảm chuyển động đều chạy. Chưa xem trực tiếp trên trình duyệt/điện thoại.

## Bổ sung cảnh luyện võ trong Rừng Trúc

- `rendering/BambooPracticeArt.js`, `scenes/BambooForestScene.js`: 3 người tập quyền tay không chậm rãi ở khoảng trống phía bắc suối, lệch nhịp nhau, có chuyển tay, hạ tấn và nghiêng người nhẹ. Vẽ cùng lớp sắp xếp chiều sâu của cảnh.
- Chỉ là hình ảnh trang trí tại chỗ, không thêm vào NPC thật, danh sách người chơi, nhiệm vụ hay dữ liệu lưu; không đổi collision/cổng. Bật giảm chuyển động sẽ giữ tư thế tĩnh.
- Kiểm tra nhanh: 3 vị trí không nằm trong vật cản; renderer chạy qua chu kỳ và chế độ giảm chuyển động; registry NPC giữ nguyên. Syntax/JSON đạt 127 file JavaScript. Chưa kiểm chứng hình ảnh trên thiết bị thật.

## Nhạc ngoài trời theo thời tiết

- `systems/OutdoorMusic.js`: 4 giai điệu tổng hợp luân phiên sau 65–100 giây, không chọn lại ngay bài vừa phát. Trời quang, lá rơi, gió, mưa và sương mù có cao độ, nhịp và âm sắc riêng.
- `systems/AudioManager.js`: nối bộ phát với thời tiết/khu vực, dùng bus nhạc và thiết lập âm lượng hiện có; ngừng phát nốt mới trong nhà, khi nhạc thiền hoặc nhạc chánh điện hoạt động.
- Chưa đổi nhạc thiền và âm thanh tụng kinh: để main xử lý cùng Prompt 5 §5 và §12 của `IMPLEMENTATION_Parse2.md`, theo yêu cầu tránh chồng chéo. Khi merge, giữ hook nhạc ngoài trời cùng cơ chế âm thanh mới của main.
- Test `tests/outdoor-music.test.mjs` kiểm tra đổi thời tiết, tránh lặp liên tiếp và các trạng thái tạm dừng. Chưa nghe thử trực tiếp trên thiết bị thật.

## Hợp đồng tính năng cho cá ăn

- Event gửi lên: `fish:feed { objectId, requestId }`; có acknowledgement `{ ok, shop, feed }` hoặc `{ error }`.
- Event trong cùng phòng/khu: `fish:fed`; snapshot khu có trường tùy chọn `fishFeed`.
- Hiệu ứng kéo dài 20 giây; cooldown mỗi người 12 giây, trong phòng 8 giây.
- Kiểm tra khu vực, khoảng cách, số túi và trạng thái thiền ở server; gửi lại cùng request trong phiên không trừ thêm túi.
- Hiệu ứng tạm giữ bằng WeakMap theo room, không lưu SQLite và không tiếp tục sau khi room bị hủy/server restart. Ví và túi đồ vẫn lưu SQLite theo hệ quầy hiện có.
- Không cộng phước, điểm thưởng, không có bảng danh vọng hoặc thay đổi StoryEngine/WorldStateManager.

## Để lại cho main / cần thống nhất trước

1. **Bác Tâm tưới cây, nhổ cỏ; thủ thư đi sắp sách:** trùng Prompt 1 §3, lịch sinh hoạt và hoạt ảnh NPC. Không sửa logic/lịch của các NPC thật trên nhánh phụ. Tên NPC giữ theo bản nền; việc đổi tên thuộc main.
2. **Ngồi đọc sách và lật trang:** yêu cầu mới đang dừng, chưa triển khai. Cần thống nhất với Prompt 5 §5 (`ReadingExperience`, đọc từng đoạn, bookmark) trước khi chỉnh `StoriesPanel` hoặc tạo giao diện đọc riêng.
3. **Tích phước từ nghi thức, bảng xếp hạng và hiệu ứng top 1:** không triển khai. Xung đột định hướng không biến nghi thức thành điểm số/cạnh tranh trong Parse 2.
4. Khách vãng lai chỉ là lớp trang trí phía client; không đưa họ vào registry, lịch sinh hoạt, hội thoại hay relationship của NPC Parse 2.

## Điểm cần đối chiếu khi merge main

File ghi chú riêng giúp tránh cùng sửa tài liệu, **không bảo đảm mã nguồn không có conflict**. Các điểm có khả năng cùng được sửa:

- `server/sockets/index.js`: giữ cả hooks Parse 2 và factory/snapshot/attach của `fishFeeding`; event cho cá ăn phải tiếp tục bị chặn trong phiên thiền.
- `public/js/main.js`, `multiplayer/SocketClient.js`: giữ cả handler/snapshot mới của main và `fish:fed`, `setFishFeed`, `fishFeed`.
- `core/Game.js`, `rendering/SceneRenderer.js`: ghép lớp khách trang trí với pipeline NPC mới, không thay thế danh sách NPC thật hoặc đếm khách trang trí thành người online.
- Giữ hook `game.onSceneChange` dọn popup khi chuyển map. Nếu main thêm phiên hội thoại phía server, ghép cơ chế kết thúc phiên của main với `DialoguePanel.close()`, không chỉ đóng DOM.
- `scenes/Scene.js`, `scenes/LotusLakeScene.js`: giữ cả world-state rendering của main và hook cá tụ lại. Cho cá ăn hiện chỉ có tác dụng tạm.
- JSON bản đồ: ghép các prop/lớp nền trang trí; giữ ID, cổng, điểm tương tác và dữ liệu story/schedule mới của main. Quầy bên phải phải thống nhất giữa bản đồ client, server và hướng dẫn.
- `rendering/props.js`, `ground.js`: giữ renderer trạng thái của main cùng các module hình ảnh mới; tránh chọn nguyên file một bên.
- `rendering/CharacterArt.js`: giữ animation nhiều giai đoạn mà main bổ sung; ghép phần ngoại hình trụ trì qua `AbbotArt.js`, không thay lại các pha lạy/thiền bằng renderer cũ.
- `ui/minigames/TeaGame.js`: giữ luật/phiên hợp tác mới của main nếu có; `TeaArt.js` chỉ là phần trình bày, cần nối với state của main thay vì ghi đè cơ chế mới.
- `README.md`: hiện có sửa một câu về vị trí quầy bên phải. Nếu trùng, giữ thông tin đúng này trong bản README mới của main, không thay nguyên file.
- `tests/run.mjs`: giữ cả test mới của main và các import `fish-feeding.test.mjs`, `presentation.test.mjs`.
- Nhánh phụ **không thêm migration** sau bản nền v3; giữ migration mới và số phiên bản của main.

## Quy trình đồng bộ

1. Commit các thay đổi của nhánh phụ trước khi nhận main; không merge khi working tree còn sửa dở.
2. Vẫn đứng ở `feature/game-improvements`, chạy `git fetch origin` rồi `git merge origin/main`.
3. Nếu có conflict, giải quyết từng khối theo các điểm đối chiếu trên; không dùng `ours`/`theirs` cho toàn bộ file dùng chung.
4. Chạy `npm run check` và `npm test`; thử lại cổng/tường/quầy, mua và cho cá ăn bằng hai phiên, NPC thật của Parse 2, pha trà và đọc sách nếu main đã thêm.
5. Khi ổn mới push nhánh phụ và mở PR về main. Chưa tự merge vào main.

## Kiểm tra gần nhất

- Ngày 2026-11-03: merge `origin/main` tại `239801d` vào nhánh phụ, giải quyết 14 file conflict. Giữ toàn bộ object ID và dữ liệu truyện/lịch NPC/hợp tác của main; quầy vẫn ở bên phải (1120, 860), có điểm cho cá ăn và các lớp trang trí riêng.
- Giữ cả pipeline WorldState/Narrative/Coop và fish feeding, cả NPC theo lịch và 8 nhân vật trang trí. Hội thoại giữ lựa chọn/hiệu ứng gõ chữ của main cùng cơ chế hủy request khi đổi map; kết thúc cả hội thoại server đang chờ và bỏ phản hồi cũ.
- Cập nhật test registry NPC để phân biệt cư dân cố định với NPC có lịch; thêm regression test hội thoại server trả lời muộn sau khi đổi map.
- `npm run check`: đạt (157 file JavaScript).
- `npm test`: **90/90 đạt**, gồm cả Parse 2 (truyện, hợp tác, world state, hành trình, chánh điện) và các kiểm tra của nhánh phụ (cho cá ăn, khách trang trí, popup, nhạc, đường đi).
- Chưa kiểm chứng trực quan bản mới trên điện thoại thật. Automated tests không thay thế kiểm tra hình ảnh và trải nghiệm thực tế.

Tiếp tục ghi thay đổi của nhánh phụ vào file này; không ghi đè `IMPLEMENTATION_Parse2.md`, `IMPLEMENTATION_PROGRESS.md` hoặc `HANDOFF.md` mà main đang cập nhật.
