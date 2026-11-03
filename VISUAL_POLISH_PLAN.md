# SÂN MÂY — VISUAL POLISH 3.0

> **Master implementation plan cho AI coding agent**  
> Repository: https://github.com/leem8888/san-may  
> Loại công việc: **Nâng cấp chất lượng hình ảnh, animation, UI/UX, âm thanh, cảm giác điều khiển và hiệu năng**.  
> **Không thêm gameplay, nhiệm vụ, NPC, minigame, kinh tế hoặc cơ chế mới.**  
> Trạng thái: **SPEC APPROVED — NOT IMPLEMENTED**.

## 0. Mục tiêu và nguyên tắc bất biến

### 0.1 Mục tiêu

Biến bản build Sân Mây hiện tại thành trải nghiệm chùa Việt 2D trên trình duyệt **đồng nhất, dễ nhìn, sống động, mượt và dễ sử dụng**, trên desktop lẫn mobile. Tối ưu những tương tác đã tồn tại, bao gồm nếu có trong HEAD: mua cá/phóng sinh, bàn cầu duyên, NPC cạo đầu và danh hiệu Chú tiểu/Tiểu ni, cất dép, quét sân, thiền, thỉnh chuông, hội thoại, nhiệm vụ, multiplayer.

**Không được giả định rằng các tính năng Temple Life đã được merge.** Agent phải kiểm tra HEAD; chỉ polish những tính năng thực sự tồn tại. Không tự triển khai tính năng thiếu.

### 0.2 Những điều tuyệt đối không làm

1. Không thay đổi business logic, phần thưởng, inventory, auth, permission, số lượng NPC, nhiệm vụ, nội dung truyện hoặc cách tính tiến trình.
2. Không thay đổi database schema/migration trừ khi có blocker được chứng minh, có phê duyệt và rollback plan; mặc định **0 migration**.
3. Không thay thế engine hoặc framework, không rewrite Canvas 2D/SceneManager/GameLoop/Socket.IO/SQLite.
4. Không thay đổi protocol multiplayer, event names/payload, API contract, persistence format nếu không cần thiết. Nếu buộc sửa, phải có compatibility tests.
5. Không tải bừa ảnh/nhạc có bản quyền, không hotlink tài nguyên, không thêm tracking/analytics bên thứ ba.
6. Không tự ý tạo asset AI bên ngoài khả năng của coding agent; nếu không có công cụ tạo asset chất lượng, cải tiến renderer/procedural art và ghi rõ giới hạn thay vì giả vờ đã tạo sprite.
7. Không được đánh dấu PASS khi chưa chạy test hoặc chưa có bằng chứng.

### 0.3 Định nghĩa thành công

- Thế giới có **một art direction** nhất quán, giữ đặc trưng chùa Việt: mái ngói đỏ, gỗ, sân gạch, cây xanh, hồ sen, màu ấm dịu.
- Nhân vật chuyển động và tương tác có trọng lượng; không có chổi/vật thể “tự bay” khi đáng ra nhân vật phải cầm.
- HUD và dialog dễ đọc, nhất quán, không che vùng chơi quan trọng; mobile dùng được bằng cảm ứng.
- Môi trường có chiều sâu nhưng không chói, không gây mỏi mắt, không phá hiệu năng.
- Âm thanh nhẹ nhàng, không autoplay trái chính sách trình duyệt; có mute và volume.
- Không có regression về gameplay, dữ liệu, multiplayer và khả năng truy cập.

## 1. GATE 0 — AUDIT SOURCE VÀ CHỤP BASELINE (BẮT BUỘC)

### 1.1 Kiểm kê repository thực tế

Agent phải:

1. `git status`, `git rev-parse HEAD`, branch, Node/npm version; ghi lại SHA chính xác. Không dựa vào tên file được nêu trong kế hoạch để đoán cấu trúc.
2. Đọc `README.md`, hướng dẫn chạy/test/deploy, các tài liệu bàn giao/QA và source liên quan đến rendering, scene, player, animation, UI, audio, input, networking.
3. Tìm module hiện hữu tương đương `SpriteRenderer`, `ParticleSystem`, `LightingSystem`, `AudioSystem`, `DayNight`, `Weather`, `CharacterArt`, `CharacterCreator`, `InteractionSystem` (tên chỉ là gợi ý, không khẳng định còn tồn tại).
4. Liệt kê các khu vực/map hiện có và kiểm kê tất cả UI surface: login, character creation, HUD, dialog, inventory, quest, journal, settings, minigame, notifications.
5. Kiểm tra trạng thái Temple Life Update trên HEAD; nếu không có, ghi `NOT PRESENT` và không tự thêm.
6. Đọc scripts `package.json`; chạy lint/test/build hiện hữu và ghi **baseline pass/fail**, không sửa âm thầm lỗi cũ mà không ghi nhận.
7. Kiểm tra `git status` sạch trước khi sửa; nếu có uncommitted changes không rõ nguồn gốc, không ghi đè, báo blocker.

### 1.2 Baseline hình ảnh và hiệu năng

Dùng browser automation nếu có; nếu không, báo thiếu công cụ và cung cấp quy trình thủ công. Chụp screenshot ở **cùng vị trí camera, cùng scene, cùng nhân vật, cùng thời điểm ánh sáng, cùng viewport** để so sánh trước/sau:

- Desktop 1440×900 và 1366×768.
- Mobile 390×844 và 360×800 (viewport emulation; không được gọi là test điện thoại thật).
- Ít nhất: khu cổng, sân chính, Chánh Điện, hồ sen, một khu nhiều cây/cảnh vật, màn tạo nhân vật, dialog NPC, inventory/quest, hoạt động quét sân; thêm các scene còn lại theo source.
- Nếu có Temple Life: bàn cầu duyên, cửa tủ dép, NPC cạo đầu/nameplate, cá phóng sinh.
- Ghi FPS p50/p95 hoặc frame time p50/p95 trong 60 giây mỗi scenario; ghi thiết bị, trình duyệt, cách đo. Ghi memory nếu có thể đo đáng tin cậy.
- Kiểm tra console errors, missing assets, overflow, clipping, hit target, màu chữ tương phản.

Tạo `docs/visual-polish/BASELINE.md` và thư mục screenshot bằng đường dẫn thực tế phù hợp repository. Không commit ảnh nhạy cảm chứa dữ liệu người dùng.

### 1.3 Audit report bắt buộc

Trước khi code, viết `docs/visual-polish/AUDIT.md` gồm: HEAD SHA, module thực tế, điểm yếu được quan sát, bảng mapping tính năng → file sửa, rủi ro, benchmark baseline, phạm vi được phép sửa, danh sách ngoại lệ. **Tiếp tục thực hiện ngay** nếu không có blocker; không dừng ở việc lập kế hoạch.

## 2. ART DIRECTION — DESIGN SYSTEM

### 2.1 Hướng mỹ thuật

- Cozy Vietnamese temple 2D top-down / 3⁄4, ưu tiên sự tĩnh tại và dễ đọc.
- Bảng màu đề xuất (có thể hiệu chỉnh sau screenshot): `#F4E8D0` giấy/kem, `#8B5E3C` gỗ, `#B65E45` ngói, `#58765B` lá trầm, `#C7A76C` vàng nhẹ, `#283B34` chữ tối.
- Tránh neon, bloom mạnh, gradient nhựa, outline quá dày, icon lẫn phong cách.
- Quy định một hệ scale/pixel density, kích thước tile, sprite, stroke, bóng và layer ordering dựa trên engine hiện tại; không trộn pixel-perfect và vector mềm tùy tiện.
- Chuẩn hóa ánh sáng theo buổi, vật liệu gỗ/gạch/nước/lá, tông màu và độ tương phản nhân vật so với nền.
- Thiết kế nameplate dễ đọc, không che đầu nhân vật khác; nếu tồn tại danh hiệu `Chú tiểu`/`Tiểu ni`, giữ nguyên text và điều kiện nhận.

### 2.2 Asset policy

- Ưu tiên cải thiện procedural Canvas art đang có; có thể dùng asset tự tạo/được cấp phép rõ ràng và lưu local trong repo.
- Nếu cần sprite sheet, định nghĩa manifest, frame dimensions, anchor points, hướng, frame duration, hitbox, fallback.
- Ghi nguồn/license cho asset ngoài repo; không dùng tài nguyên chưa rõ quyền sử dụng.
- Không chuyển toàn bộ pipeline sang spritesheet nếu lợi ích không rõ; chỉ thay những chỗ tạo cải thiện thực sự.

### 2.3 Design tokens

Tập trung màu, font, spacing, radius, shadows, animation durations, z-index và breakpoints vào nơi cấu hình thống nhất theo kiến trúc hiện có. Không rải hardcoded values trên nhiều module. Viết `docs/visual-polish/STYLE_GUIDE.md` có ví dụ minh họa và quy tắc tái sử dụng.

## 3. MODULE VP1 — WORLD ART & DEPTH

**Mục tiêu:** Cải thiện tất cả map hiện hữu mà không đổi layout gameplay/collision.

1. Cải thiện tile nền, đường đi, gạch sân, viền cỏ, bậc thềm, gỗ, mái ngói, cây, đá, hồ sen bằng palette thống nhất.
2. Bổ sung chi tiết có chọn lọc: vết gạch nhẹ, cụm cỏ, hoa sen, lá, bóng tán cây, texture nước. Giữ khoảng trống và khả năng nhận biết đường đi.
3. Dùng đúng painter's order/y-sort, lớp foreground, shadow mềm và occlusion; không làm player biến mất sau cây/vật thể.
4. Giữ nguyên tọa độ tương tác, collision geometry, pathfinding, entrances, spawn points; không được dịch chuyển vật thể logic chỉ để đẹp.
5. Chuẩn hóa tỷ lệ nhân vật/cửa/công trình/vật phẩm giữa các scene; test mọi map.
6. Nếu thêm animated props (cờ, lá, mặt nước), chạy theo time delta, không phụ thuộc FPS và có reduced motion.

**Acceptance:** Trước/sau rõ ràng ở mọi map; không đổi gameplay collision; không có clipping/z-fighting, vật thể xuyên nhân vật, texture seam hoặc text mất tương phản.

## 4. MODULE VP2 — CHARACTER & INTERACTION ANIMATION

**Mục tiêu:** Nhân vật có cảm giác sống mà không thay đổi hành động gameplay.

1. Kiểm kê sprite/renderer/animation state hiện có; thiết lập state machine hoặc mở rộng state machine cũ, **không tạo hệ thống song song**.
2. Chuẩn hóa `idle`, `walk` theo 4 hướng nếu game dùng 4 hướng; nếu 8 hướng đang tồn tại, giữ 8 hướng. Đồng bộ chuyển trạng thái và facing direction.
3. Idle: chuyển động thở rất nhẹ; walk: chu kỳ chân/tay, nhún thân vừa phải, bóng chân; tránh trượt chân và jitter khi đứng.
4. Các animation tương tác đã tồn tại: quét sân (chổi gắn vào tay, tay/thân chuyển động, lá phản hồi), thỉnh chuông, thiền, cất/lấy dép, phóng sinh, rút thẻ, tương tác NPC — **chỉ khi chức năng tương ứng có trong source**.
5. Xác định animation anchor, pivot, draw order, hướng cầm vật, blending/cancel, thời điểm effect; đảm bảo animation không tự kích hoạt logic giao dịch lần hai.
6. Tách `visual animation state` khỏi `authoritative action result`; server vẫn quyết định kết quả, client chỉ render.
7. Với multiplayer, tận dụng event/state hiện có; không spam network theo frame. Remote player phải thấy đúng animation hoặc fallback hợp lý; không nhân đôi avatar hay item.
8. Tên và danh hiệu giữ vị trí ổn định khi nhân vật nhún; xử lý overlap khi nhiều người đứng gần nhau.

**Acceptance:** Không có “chổi tự bay”; không duplicate player; không mất animation sau reconnect; hoạt động chính có phản hồi trực quan; tốc độ di chuyển và collision không đổi.

## 5. MODULE VP3 — UI/UX & ACCESSIBILITY

1. Audit tất cả màn hình UI đang có, chuẩn hóa font hierarchy, button states, dialog, panel, tab, toast, icon, spacing, focus ring, loading/disabled states.
2. HUD desktop gọn, không che scene; mobile ưu tiên nút quan trọng, vùng cảm ứng ≥44×44 CSS px nếu khả thi; safe area cho notch.
3. Dialog NPC: độ rộng phù hợp, line-height, lựa chọn rõ, nút tiếp tục/bỏ qua nhất quán, không mất keyboard focus.
4. Inventory, nhiệm vụ, nhật ký: thống nhất panel và trạng thái empty/loading/error; không thay đổi dữ liệu hoặc nội dung nhiệm vụ.
5. Character creator: preview nam/nữ dễ phân biệt bằng **lựa chọn/nhãn rõ ràng** và ngoại hình; không gán khuôn mẫu cứng. Nếu Temple Life tồn tại, preview đầu cạo và danh hiệu phải khớp dữ liệu thực.
6. Tooltips/interact prompts chỉ hiện khi phù hợp, không che người chơi; có tín hiệu phím/touch; hạn chế popup chồng nhau.
7. Đảm bảo text tiếng Việt có dấu không bị cắt, font có glyph đầy đủ, tương phản đọc được; không dùng màu là tín hiệu duy nhất.
8. Hỗ trợ keyboard navigation ở HTML controls, focus visible, Esc/back hợp lý; tôn trọng `prefers-reduced-motion`.
9. Giữ API/DOM selectors mà tests hoặc game đang phụ thuộc; nếu buộc đổi, cập nhật tests.

**Acceptance:** Không overflow ở 360×800; mọi hành động cốt lõi dùng được bằng touch; UI không che khu tương tác; các trạng thái lỗi/loading rõ ràng.

## 6. MODULE VP4 — ATMOSPHERE, LIGHTING & PARTICLES

1. Dùng hệ thống lighting/particle/day-night/weather hiện có; không xây duplicate.
2. Nước hồ có ripple nhẹ, lá rơi có mật độ thấp, khói hương có hướng chuyển động tự nhiên, tia nắng/đổ bóng vừa phải; chỉ áp dụng nơi phù hợp.
3. Day/night: chuyển tông mượt, bảo toàn độ sáng vùng tương tác và readability của nameplate/UI.
4. Weather: nắng/mây/mưa thể hiện rõ nhưng không che nhân vật, không đổi luật gameplay.
5. Particle pooling, viewport culling, cap số hạt theo quality setting; tránh tạo object mỗi frame và overdraw lớn.
6. Cung cấp `Low / Medium / High` hoặc `Reduce effects` theo hệ settings hiện có; tôn trọng reduced motion.
7. Không gây nhấp nháy mạnh, flash, shake đột ngột hoặc hiệu ứng khiến khó chịu.

**Acceptance:** Có thay đổi hình ảnh quan sát được, không làm giảm đáng kể FPS; trên mobile có thể tắt hiệu ứng tốn tài nguyên.

## 7. MODULE VP5 — AUDIO & FEEDBACK

1. Audit `AudioSystem`/Web Audio hiện có; tái sử dụng, không tạo audio engine song song.
2. Chuẩn hóa âm lượng master/ambient/effects nếu settings cho phép; mute, persistence preference, không tự phát trước user gesture.
3. Cải thiện tiếng bước chân theo loại nền **nếu đã có dữ liệu bề mặt**; không thêm logic gameplay để suy ra nền mới.
4. Chuông ngân tự nhiên, âm gió/lá/nước/tiếng quét sân tinh tế, click/confirm/deny nhẹ và nhất quán.
5. Tránh âm thanh trùng khi reconnect, spam action, nhiều người tương tác; giới hạn concurrent voices và debounce audio-only events.
6. Nếu không có asset âm thanh hợp pháp, dùng Web Audio synthesis phù hợp hoặc ghi `asset gap`; không lấy audio trên mạng không rõ bản quyền.

**Acceptance:** Không autoplay error, không clipping, không âm thanh chồng vô hạn; mute/volume hoạt động sau reload; môi trường vẫn yên tĩnh.

## 8. MODULE VP6 — CAMERA, INPUT, PERFORMANCE

1. Cải thiện camera smoothing và scene transitions nếu có lỗi thực tế; không làm tăng input latency hay phá camera bounds.
2. Input pointer/touch/keyboard: highlight hover/focus, feedback click/tap, không double-activate, không mất thao tác do overlay.
3. Canvas DPR scaling và resize đúng; giữ nét art theo style đã chọn; tránh blur do scale không nhất quán.
4. Tối ưu cache layer tĩnh, dirty regions hoặc offscreen canvas **chỉ khi benchmark cho thấy có lợi**; tránh tối ưu mù.
5. Dùng `requestAnimationFrame`/delta time, clamp delta khi tab resume, cull offscreen, giảm allocations per frame.
6. Không thay đổi tick server hoặc tần suất Socket.IO để chữa lỗi render nếu chưa chứng minh nguyên nhân.
7. Quality settings lưu local theo cơ chế hiện tại, không yêu cầu database migration.

### Mục tiêu hiệu năng (đo, không được bịa)

- Desktop mục tiêu 60 FPS trong scene thông thường trên máy test được ghi rõ.
- Mobile viewport emulation mục tiêu ≥30 FPS ổn định; test thiết bị thật nếu có, không suy diễn từ emulation.
- Không regression frame time p95 >15% so với baseline trong cùng điều kiện; nếu baseline đã tệ, ưu tiên cải thiện.
- Không console errors mới, không memory leak rõ rệt trong session 15 phút có chuyển scene và reconnect.
- Nếu không đạt, ghi nguyên nhân và số đo thực, không tự ghi PASS.

## 9. TRIỂN KHAI TRONG MỘT LƯỢT — CHECKPOINTS NỘI BỘ

AI agent phải thực hiện liên tục theo thứ tự sau, không dừng để hỏi người dùng sau mỗi checkpoint trừ khi có blocker thật:

| Checkpoint | Việc phải làm | Điều kiện chuyển bước |
|---|---|---|
| C0 | Gate 0, baseline, audit, branch riêng | Có danh sách file và số đo baseline hoặc giới hạn đo được ghi rõ |
| C1 | Design tokens, style guide, art direction | Screenshot sample trước/sau, không ảnh hưởng gameplay |
| C2 | World art toàn map | Không lỗi collision, render order, scene transition |
| C3 | Character & interaction animations | Không duplicate avatar, không đổi action logic |
| C4 | UI/UX desktop + mobile | Không overflow, mọi nút cốt lõi hoạt động |
| C5 | Atmosphere + audio | Có settings, không autoplay/particle overload |
| C6 | Camera/input/performance | Có benchmark so sánh và fix regression |
| C7 | Full QA, docs, handoff, commit | Đạt Definition of Done, báo cáo trung thực |

- Mỗi checkpoint: sửa code → chạy unit/integration tests liên quan → browser smoke → ghi kết quả → mới đi tiếp.
- Nên tạo commit theo checkpoint trên branch `feature/visual-polish-3`; **không force-push, không rewrite history**.
- Nếu test fail: sửa và chạy lại. Nếu không sửa được: ghi blocker, không tuyên bố COMPLETE.
- Không làm việc ngoài scope dù phát hiện ý tưởng gameplay hấp dẫn.

## 10. TEST MATRIX BẮT BUỘC

### 10.1 Automated / regression

- Chạy toàn bộ scripts test hiện có trước/sau, không giảm số lượng tests hoặc bỏ qua tests lỗi.
- Test state animation: idle↔walk, 4/8 hướng, interact start/end/cancel, tab resume.
- Test draw order, camera bounds, resize, DPR, scene unload, settings persistence.
- Test UI: dialogs, modal stack, focus, Esc, touch hit targets, responsive overflow.
- Test asset load/fallback; không crash khi sprite/audio chưa sẵn sàng.
- Test gameplay regression: login/guest, movement, scene changes, interactions, inventory, quests, minigames, persisted state.
- Test multiplayer hai client: local/remote avatars, animations, nameplates, reconnect, không duplicated events/players.
- Nếu Temple Life đã merge: test danh hiệu nam Chú tiểu/nữ Tiểu ni, cất/lấy dép, quét sân, cầu duyên, phóng sinh ở mức regression, **không sửa luật gameplay**.

### 10.2 Browser QA có bằng chứng

- Desktop 1440×900, 1366×768; mobile emulation 390×844, 360×800.
- Tất cả khu vực thực có trên HEAD, không mặc định chính xác 8 khu nếu source khác.
- Mỗi khu: screenshot baseline/after cùng camera và ánh sáng; ghi link/path screenshot.
- Test ít nhất 2 client cùng phòng; thao tác, di chuyển, reconnect, chuyển khu, dialog và animation remote.
- Test settings: mute, reduced motion, low effects; test tab background/resume.
- Kiểm tra console, network failures, 404 assets, unhandled promise rejection, layout overflow.
- Benchmark trong cùng máy/trình duyệt/scene/số player; báo FPS/frame-time p50/p95 trước/sau.
- Nếu automation browser không có, không bịa ảnh hay kết quả; ghi `NOT RUN` và cung cấp checklist chạy thủ công.

### 10.3 Acceptance thresholds

- 100% tests hiện hữu phải pass hoặc nêu rõ lỗi baseline chưa xử lý, không được che giấu.
- 0 lỗi nghiêm trọng về login, gameplay, lưu dữ liệu, scene, multiplayer.
- 0 lỗi layout blocker ở các viewport mục tiêu.
- 0 missing asset và 0 console error mới trong test path.
- Không giảm hiệu năng quá ngưỡng nêu ở mục 8 mà không có giải thích và kế hoạch khắc phục.
- Có screenshot trước/sau cho các màn quan trọng; khác biệt phải thực chất, không chỉ đổi màu một nút.

## 11. RỦI RO VÀ BIỆN PHÁP

| Rủi ro | Biện pháp |
|---|---|
| AI rewrite quá rộng | Chỉ sửa module đã audit, diff review từng checkpoint |
| Phong cách đồ họa không đồng nhất | Style guide + screenshot review toàn map |
| Animation làm sai hitbox/collision | Tách render transform khỏi gameplay coordinates |
| Remote player lệch animation | Reuse state/event hiện có, two-client QA |
| FPS tụt do particle/lighting | Quality tiers, culling, pooling, benchmark |
| UI mobile che nút | Viewport matrix + touch QA |
| Âm thanh spam/autoplay | User gesture unlock, concurrency caps, mute |
| Dữ liệu người chơi hỏng | Không migration, không sửa persistence; backup trước test trên DB thật |
| Agent báo PASS ảo | Mỗi PASS phải có command, output, screenshot hoặc log |

## 12. DELIVERABLES / HANDOFF

Agent phải tạo/cập nhật các tài liệu phù hợp (không xóa tài liệu cũ):

- `docs/visual-polish/AUDIT.md`: source map, baseline SHA, phạm vi và rủi ro.
- `docs/visual-polish/STYLE_GUIDE.md`: palette, tỷ lệ, layering, UI tokens, animation principles.
- `docs/visual-polish/BEFORE_AFTER.md`: bảng screenshot trước/sau, viewport, scene, nhận xét cụ thể.
- `docs/visual-polish/PERFORMANCE.md`: phương pháp đo, máy, FPS/frame time p50/p95, so sánh.
- `docs/visual-polish/QA_REPORT.md`: lệnh test, output, test matrix, PASS/FAIL/NOT RUN, blocker.
- `docs/visual-polish/HANDOFF.md`: file thay đổi, lý do, giới hạn, rollback, commit SHA, việc chưa xong.
- Cập nhật README/IMPLEMENTATION_PROGRESS/HANDOFF hiện có **nếu chúng thực sự tồn tại** và phù hợp quy ước repo.
- Không commit `.env`, secrets, database thật, log người dùng, ảnh chứa thông tin riêng tư hoặc `node_modules`.

### Format báo cáo cuối cùng

1. HEAD trước/sau và branch/commit.
2. Danh sách module đã hoàn thành kèm bằng chứng.
3. Tổng quan file đã thay đổi, số dòng, thay đổi kiến trúc (nếu có).
4. Lệnh test + số pass/fail; browser QA + screenshot links.
5. Benchmark trước/sau và điều kiện đo.
6. Những giới hạn chưa kiểm thử / vấn đề còn lại.
7. Đánh giá `COMPLETE`, `PARTIAL`, hoặc `BLOCKED` theo DoD, không tự nhận production-ready.

## 13. DEFINITION OF DONE — CHỈ COMPLETE KHI ĐỦ

- [ ] Gate 0 có audit HEAD và baseline có bằng chứng.
- [ ] Art direction/style guide thống nhất, tất cả map được kiểm tra.
- [ ] Animation nhân vật và tương tác hiện hữu được nâng cấp, không phá logic.
- [ ] UI/UX desktop/mobile cải thiện rõ, không blocker.
- [ ] Lighting/particles/audio được tối ưu, có tùy chọn giảm hiệu ứng/mute.
- [ ] Camera/input mượt, không regression FPS nghiêm trọng.
- [ ] Gameplay và persistence không thay đổi ngoài phạm vi.
- [ ] Multiplayer 2 client và reconnect pass.
- [ ] Full regression tests pass hoặc mọi exception được ghi rõ và chưa đánh dấu COMPLETE.
- [ ] Có screenshot before/after và performance report thực đo.
- [ ] Tài liệu bàn giao, commit rõ ràng, không secrets.

## 14. PROMPT DÙNG NGAY CHO AI CODING AGENT

> Hãy đọc toàn bộ `VISUAL_POLISH_PLAN.md` tại thư mục gốc repository `san-may`. Tôi phê duyệt thực hiện toàn bộ **Sân Mây — Visual Polish 3.0** trong một lượt làm việc. Không chỉ lập kế hoạch: hãy audit source HEAD, chạy baseline, tự triển khai lần lượt các checkpoint C0–C7, tự test và sửa lỗi. Chỉ polish các tính năng thực sự tồn tại trong source; không tự thêm gameplay mới, không rewrite engine, không đổi database/protocol. Tạo style guide, screenshots trước/sau, performance report, QA report và handoff theo tài liệu. Ưu tiên cải thiện art direction toàn map, animation nhân vật, UI mobile, lighting, âm thanh và FPS. Mỗi kết luận PASS phải có bằng chứng thực tế; nếu không có browser automation, báo NOT RUN trung thực. Cuối cùng commit lên branch riêng, báo SHA, danh sách thay đổi, số liệu benchmark và các blocker. Chỉ đánh dấu COMPLETE khi thỏa toàn bộ Definition of Done.

---

**Ghi chú:** Đây là tài liệu yêu cầu triển khai, không phải chứng nhận rằng code hiện tại đã được kiểm thử hoặc rằng các tên module gợi ý chắc chắn tồn tại trong HEAD.
