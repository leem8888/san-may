# PROMPT 1/5 — SÂN MÂY 2.0: NPC STORY & RELATIONSHIP SYSTEM

Bạn là Senior Game Developer, Narrative Designer và Full-stack Engineer.

## Bối cảnh

Tôi đã có dự án game SÂN MÂY chạy được bằng HTML, CSS, JavaScript ES Modules, Canvas 2D, Node.js, Express, Socket.IO và SQLite.

Theo IMPLEMENTATION_PROGRESS.md, dự án hiện có 3 NPC, hội thoại JSON thông qua DialogueProvider, 8 khu vực, hệ thống nhiệm vụ, tiến trình người chơi và multiplayer.

Nhiệm vụ của bạn là trực tiếp nâng cấp NPC hiện có thành những nhân vật có câu chuyện, tính cách, lịch sinh hoạt, trí nhớ và khả năng tương tác với thế giới.

Không viết lại dự án. Không tạo NPC chỉ để hiển thị một hộp thoại tĩnh.

## 1. Phân tích dự án

Trước khi code:
- Đọc IMPLEMENTATION_PROGRESS.md, HANDOFF.md, README.md.
- Tìm các module NPC, DialogueProvider, Quest, PlayerProgress, SceneManager, Socket.IO và SQLite.
- Xác định những phần có thể tái sử dụng.
- Kiểm tra cấu trúc dữ liệu hiện tại.
- Lập kế hoạch migration tương thích dữ liệu cũ.

## 2. Thiết kế 3 NPC

### NPC 1 — Chú Tiểu An

Tính cách: vui vẻ, tò mò, đôi lúc vụng về.

Vai trò: hướng dẫn người chơi và dẫn dắt câu chuyện chính.

Câu chuyện: "Chiếc chuông bị lãng quên".

Gồm 4 chương:
1. Chú Tiểu phát hiện trang nhật ký cũ.
2. Người chơi tìm manh mối trong thư viện.
3. Người chơi khám phá bí mật tại tháp chuông.
4. Hoàn thành câu chuyện, mở khóa một thay đổi trong thế giới và vật phẩm kỷ niệm.

Mỗi chương cần có hội thoại, hành động, mục tiêu, điều kiện hoàn thành, trạng thái lưu và phần thưởng thực tế.

### NPC 2 — Bác Lâm

Tính cách: điềm đạm, yêu thiên nhiên.

Vai trò: dẫn dắt các hoạt động trồng cây, quét lá, khôi phục khu vườn.

Câu chuyện: "Khu vườn bị lãng quên".

Có ít nhất 3 chương:
- Dọn dẹp khu vườn.
- Tìm giống cây đặc biệt.
- Khôi phục khu vườn và mở khóa vật phẩm trang trí.

### NPC 3 — Thầy Minh

Tính cách: điềm tĩnh, sâu sắc, hiểu biết.

Vai trò: quản lý thư viện và kể các câu chuyện ngắn có ý nghĩa.

Câu chuyện: "Những bức thư chưa gửi".

Có ít nhất 3 chương với lựa chọn hội thoại, manh mối và những kết thúc mang ý nghĩa suy ngẫm.

Nội dung Phật giáo cần chính xác, tôn trọng tôn giáo; không tự tạo trích dẫn rồi gán cho kinh điển.

## 3. NPC có lịch sinh hoạt

NPC không đứng cố định.

Tạo lịch sinh hoạt theo chu kỳ thời gian trong game:
- Buổi sáng: xuất hiện tại khu vực phù hợp.
- Buổi trưa: thực hiện hoạt động thường ngày.
- Buổi chiều: đi đến khu vực khác.
- Buổi tối: nghỉ ngơi hoặc tham gia sự kiện.

NPC phải có animation đi bộ, idle, ngồi, đọc sách, tưới cây hoặc hành động phù hợp.

Tận dụng hệ thống collision và navigation hiện có. Không cho NPC đi xuyên vật thể.

Nếu người chơi đang hội thoại, NPC không đột ngột biến mất vì lịch chuyển cảnh.

## 4. Hội thoại có trạng thái

Tạo hoặc mở rộng DialogueEngine hỗ trợ:
- Hội thoại nhiều nhánh.
- Lựa chọn của người chơi.
- Điều kiện mở khóa hội thoại.
- Hội thoại theo chương truyện.
- Hội thoại thay đổi theo thời gian, thời tiết và tiến trình.
- NPC ghi nhớ những lựa chọn quan trọng.
- Không lặp lại hội thoại giới thiệu sau khi đã quen.
- Cho phép xem lại câu chuyện trong nhật ký.

Hội thoại nên ngắn, tự nhiên, có cảm xúc. Tránh những đoạn văn dài liên tục.

## 5. Trí nhớ và quan hệ

Tạo hệ thống NPC Memory:
- Đã gặp NPC hay chưa.
- Chương truyện hiện tại.
- Các lựa chọn quan trọng.
- Hoạt động đã cùng thực hiện.
- Mức độ quen biết.

Mức độ quen biết chỉ nên dùng để mở khóa nội dung, không biến thành cơ chế cày điểm hoặc quà tặng bắt buộc.

## 6. Cơ sở dữ liệu

Thiết kế migration phù hợp cho:
- NPC story progress.
- Dialogue choices.
- NPC relationship state.
- Story flags.
- NPC schedules nếu cần lưu.

Ưu tiên tái sử dụng bảng tiến trình hiện tại nếu phù hợp.

Dữ liệu quan trọng do server xác thực, không tin hoàn toàn client.

## 7. Multiplayer

- NPC có vị trí và trạng thái nhất quán giữa người chơi trong cùng phòng.
- Tiến trình câu chuyện cá nhân không bị ghi đè bởi người chơi khác.
- Khi nhiều người nói chuyện cùng NPC, mỗi người có hội thoại riêng.
- Sự kiện NPC chung phải đồng bộ bằng Socket.IO.
- Người vào phòng muộn nhận đúng trạng thái NPC.

## 8. UI/UX

- Hộp thoại đẹp, đồng nhất với phong cách SÂN MÂY.
- Có tên NPC, chân dung hoặc sprite, biểu cảm.
- Hỗ trợ chuột, bàn phím và cảm ứng.
- Có lựa chọn hội thoại rõ ràng.
- Có dấu hiệu khi NPC có câu chuyện mới.
- Có thể bỏ qua hiệu ứng gõ chữ.
- Nhật ký theo dõi từng chương.

## 9. Kiểm thử và nghiệm thu

Phải kiểm tra:
- NPC di chuyển đúng lịch.
- Hội thoại phân nhánh đúng.
- Reload vẫn giữ tiến trình.
- Hai người chơi nói chuyện với NPC không gây xung đột.
- NPC không xuyên tường.
- Câu chuyện có thể hoàn thành từ đầu đến cuối.
- Không làm hỏng nhiệm vụ, bản đồ hoặc hệ thống NPC cũ.

## 10. Cách triển khai

Triển khai theo thứ tự:
1. Audit hệ thống hiện tại.
2. Data model và migration.
3. DialogueEngine và StoryEngine.
4. NPC schedule và animation.
5. Hoàn thiện câu chuyện Chú Tiểu An.
6. Hoàn thiện Bác Lâm và Thầy Minh.
7. Multiplayer, UI và kiểm thử.

Sau mỗi bước, chạy game và kiểm thử.

Cập nhật IMPLEMENTATION_PROGRESS.md và HANDOFF.md.

Không tuyên bố hoàn thành nếu câu chuyện chưa thực sự chơi được từ đầu đến cuối.

Hãy bắt đầu phân tích mã nguồn và trực tiếp triển khai.

# PROMPT 2/5 — SÂN MÂY 2.0: COOPERATIVE MULTIPLAYER GAMEPLAY

Bạn là Senior Multiplayer Game Developer, Gameplay Designer và Node.js Engineer.

## Mục tiêu

Nâng cấp multiplayer của SÂN MÂY từ "nhìn thấy nhau và đồng bộ hành động" thành "hai người có thể thực sự chơi và tạo kỷ niệm cùng nhau".

Dự án đã có Socket.IO, phòng tối đa 20 người, đồng bộ vị trí, reconnect, heartbeat, rate limit và server authoritative.

Phải tái sử dụng các hệ thống này.

Không tạo hoạt động hai người giả bằng cách chỉ yêu cầu hai người bấm cùng một nút.

## 1. Hệ thống Cooperative Session

Thiết kế module quản lý phiên hợp tác:
- Tạo lời mời.
- Chấp nhận hoặc từ chối.
- Xác nhận hai người sẵn sàng.
- Bắt đầu hoạt động.
- Đồng bộ trạng thái.
- Kết thúc thành công hoặc hủy.
- Xử lý mất kết nối.
- Xử lý một người rời bản đồ.
- Khôi phục phiên nếu reconnect trong thời gian cho phép.
- Chống spam lời mời.

Phiên hợp tác có ID riêng, room ID, danh sách người tham gia, trạng thái, thời gian và kết quả.

Không cho client tự gửi sự kiện "hoàn thành" để nhận thưởng.

## 2. Hoạt động A — Bàn trà hai người

Thiết kế một bàn trà có hai vị trí ngồi.

Gameplay:
1. Người A tương tác với bàn trà.
2. Người A mời người B.
3. Người B chấp nhận và đi đến bàn.
4. Hai nhân vật ngồi xuống bằng animation.
5. Người A chọn loại trà.
6. Người B chuẩn bị chén.
7. Người A rót trà.
8. Hai người cùng thưởng trà.
9. Một đoạn hội thoại hoặc chủ đề trò chuyện xuất hiện.
10. Hoàn thành phiên, lưu kỷ niệm.

Có animation hơi nước, rót trà, nâng chén và đặt chén.

Có tùy chọn chat tự do hoặc chủ đề trò chuyện có sẵn.

Không tự động gửi nội dung riêng tư cho người khác.

## 3. Hoạt động B — Thiền chung

Cho phép 2 người cùng tham gia phiên thiền.

- Một người tạo phiên.
- Người còn lại chấp nhận.
- Cả hai chọn thời lượng chung: 3, 5, 10 hoặc 15 phút.
- Có trạng thái sẵn sàng.
- Đồng hồ do server quản lý.
- Nhân vật ngồi thiền đồng bộ.
- Hiệu ứng hít thở nhẹ.
- Có thể rời phiên bất kỳ lúc nào.
- Không trừng phạt nếu kết thúc sớm.
- Không có bảng xếp hạng.

Khi hoàn thành, tạo khoảnh khắc môi trường đặc biệt cho cả hai.

## 4. Hoạt động C — Cùng thỉnh chuông

Thiết kế một nghi thức hợp tác nhẹ nhàng:
- Hai người đến tháp chuông.
- Người A chuẩn bị.
- Người B xác nhận.
- Cả hai phối hợp theo hướng dẫn.
- Chuông ngân, có animation và hiệu ứng môi trường.

Không thiết kế thành trò phản xạ tốc độ hoặc spam phím.

## 5. Hoạt động D — Khôi phục khu vườn chung

- Hai người cùng dọn lá.
- Trồng cây.
- Tưới cây.
- Đặt vật phẩm trang trí.
- Thay đổi cảnh quan.
- Lưu những đóng góp.

Mỗi người có thể thực hiện những công việc khác nhau.

Tạo các mốc khôi phục:
- Vườn hoang.
- Vườn được dọn sạch.
- Vườn có cây non.
- Vườn nở hoa.
- Vườn hoàn chỉnh.

Đồng bộ trạng thái qua Socket.IO và lưu SQLite.

## 6. Hoạt động E — Câu đố hợp tác

Tạo một câu đố trong thế giới chùa.

Ví dụ:
- Người A tìm manh mối trong thư viện.
- Người B quan sát ký hiệu tại tháp chuông.
- Hai người trao đổi thông tin.
- Cùng kích hoạt hai vật thể để mở một bí mật.

Câu đố cần có logic thực, trạng thái thực và điều kiện thắng rõ ràng.

Không chỉ tạo hộp thoại thông báo đã giải đố.

Có gợi ý nếu người chơi mắc kẹt.

Có chế độ solo với NPC hỗ trợ, nhưng trải nghiệm hai người phải hấp dẫn hơn.

## 7. Tương tác nhân vật

Bổ sung:
- Mời bạn ngồi.
- Chắp tay chào nhau.
- Vẫy tay.
- Ngồi cạnh nhau.
- Cùng nâng chén trà.
- Chụp ảnh chung.
- Hiển thị lời mời và phản hồi.

Không cho người khác tự ý điều khiển hoặc di chuyển nhân vật của người chơi.

## 8. Backend và SQLite

Thiết kế dữ liệu cho:
- Cooperative sessions.
- Session participants.
- Cooperative achievements.
- Shared garden progress.
- Shared memories.

Chỉ thêm bảng mới khi thực sự cần.

Socket.IO events phải có schema, validation, authorization, rate limit và server acknowledgement.

Xử lý race condition khi hai người tương tác đồng thời.

## 9. UI/UX

- Nút mời bạn rõ ràng.
- Hiển thị trạng thái đang chờ.
- Có thể từ chối hoặc hủy.
- Hướng dẫn từng bước.
- Hiển thị vai trò của mỗi người.
- Animation kết quả chung.
- Không che mất Canvas.
- Hỗ trợ mobile.

## 10. Kiểm thử

Phải kiểm thử bằng ít nhất hai browser context thật:
- Mời và chấp nhận.
- Từ chối.
- Hủy phiên.
- Một người mất kết nối.
- Hai người reconnect.
- Hoàn thành hoạt động.
- Reload giữ dữ liệu đã lưu.
- Không nhận thưởng hai lần.
- Không tương tác chéo giữa các phòng.

Triển khai theo thứ tự:
1. CooperativeSessionManager.
2. Bàn trà.
3. Thiền chung.
4. Cùng thỉnh chuông.
5. Khu vườn chung.
6. Câu đố hợp tác.
7. UI, animation và kiểm thử.

Cập nhật IMPLEMENTATION_PROGRESS.md và HANDOFF.md.

Bắt đầu phân tích dự án và trực tiếp code. Không thay thế hệ thống multiplayer hiện tại.

# PROMPT 3/5 — SÂN MÂY 2.0: REACTIVE & PERSISTENT WORLD

Bạn là Senior Game Engine Developer, Gameplay Systems Designer và Backend Engineer.

## Bối cảnh

SÂN MÂY đã có 8 khu vực, một khu vườn cá nhân, SceneManager, hệ thống thời tiết, ngày đêm, particle, lighting, collision, SQLite và Socket.IO.

Tôi muốn nâng cấp game thành một thế giới có khả năng phản ứng và thay đổi theo hành động của người chơi.

Mục tiêu không phải thêm hiệu ứng đơn thuần, mà là tạo cảm giác người chơi thực sự để lại dấu ấn trong thế giới.

Giữ nguyên kiến trúc Canvas 2D + JavaScript + Node.js + SQLite + Socket.IO.

## 1. Phân tích hệ thống hiện tại

Trước khi code:
- Đọc IMPLEMENTATION_PROGRESS.md, HANDOFF.md, README.md.
- Kiểm tra SceneManager, WeatherSystem, DayNightSystem, ParticleSystem, LightingSystem, InteractionSystem.
- Kiểm tra dữ liệu bản đồ và collision.
- Kiểm tra hệ thống garden và player progress.
- Kiểm tra Socket.IO room state.
- Xác định cách bổ sung world state mà không phá vỡ save data cũ.

## 2. Xây dựng WorldStateManager

Tạo hoặc mở rộng hệ thống quản lý trạng thái thế giới.

Hỗ trợ ba phạm vi:
1. Personal state: thay đổi chỉ thuộc về người chơi.
2. Room state: thay đổi thuộc về một phòng multiplayer.
3. Shared world state: thay đổi chung có thể tồn tại lâu dài.

Mỗi trạng thái phải có:
- ID.
- Scene ID.
- Object ID.
- State type.
- State value.
- Scope.
- Owner hoặc room ID nếu có.
- Thời gian cập nhật.
- Thời gian hết hạn nếu là trạng thái tạm.
- Version để xử lý đồng bộ.

Không dùng một biến global duy nhất chứa mọi trạng thái.

## 3. Thế giới phản ứng tức thì

Triển khai các phản ứng có thể nhìn và nghe thấy:

### Thỉnh chuông
- Chuông rung.
- Âm thanh có độ ngân.
- Chim gần đó bay lên.
- Đèn lồng rung nhẹ.
- NPC gần đó quay nhìn.
- Các người chơi trong khu vực cùng nghe và nhìn thấy.

### Quét sân
- Lá bị loại bỏ tại vị trí đã quét.
- Mặt sân sạch dần.
- NPC có phản hồi.
- Trạng thái sạch được duy trì trong phiên.

### Thả hoa đăng
- Đèn xuất hiện trên mặt hồ.
- Đèn trôi theo quỹ đạo hợp lý.
- Phản chiếu ánh sáng trên mặt nước.
- Những người chơi khác nhìn thấy cùng một đèn.

### Thắp nến
- Nến có trạng thái tắt / đang cháy / cháy hết.
- Ánh sáng tác động lên khu vực gần đó.
- Có animation ngọn lửa.
- Có thể tắt nến nếu phù hợp với tương tác.

### Trồng và tưới cây
- Cây thay đổi sprite theo giai đoạn.
- Có animation khi tưới.
- Cây phát triển theo thời gian server.
- Tránh yêu cầu người chơi đăng nhập liên tục để cây tồn tại.

## 4. Thay đổi trong một phiên chơi

Tạo các thay đổi có tiến trình nhiều bước.

Ví dụ: Khôi phục sân chùa.

Trạng thái:
- DIRTY.
- CLEANING.
- CLEAN.
- DECORATED.

Người chơi có thể:
- Quét lá.
- Thu gom lá.
- Lau dọn một số vật thể.
- Trang trí bằng đèn hoặc hoa.

Khi hoàn thành:
- Bản đồ thay đổi trực quan.
- NPC thay đổi hội thoại.
- Mở khóa một tương tác mới.
- Các người chơi trong phòng cùng nhìn thấy kết quả.

Không chỉ đổi progress bar; phải thay đổi vật thể và cảnh quan trên Canvas.

## 5. Thay đổi lâu dài

Triển khai ít nhất hai chuỗi thay đổi lâu dài.

### Chuỗi A — Khu vườn được hồi sinh

Các giai đoạn:
1. Vườn hoang.
2. Vườn được dọn dẹp.
3. Vườn có cây non.
4. Vườn nở hoa.
5. Vườn hoàn thiện.

Mỗi giai đoạn phải thay đổi ít nhất:
- Vật thể.
- Cảnh quan.
- Animation hoặc hiệu ứng.
- Hội thoại NPC.
- Một tương tác có thể thực hiện.

### Chuỗi B — Ánh sáng Chánh điện

Các giai đoạn:
1. Chánh điện ở trạng thái ban đầu.
2. Người chơi tìm được câu chuyện về chiếc đèn.
3. Người chơi chuẩn bị vật phẩm.
4. Hoàn thành một hoạt động chung.
5. Chiếc đèn được thắp sáng và lưu trạng thái.

Chiếc đèn là yếu tố kể chuyện, không phải hệ thống điểm số.

## 6. Tương tác với NPC và cốt truyện

WorldStateManager phải có API để:
- StoryEngine đọc world flags.
- NPC thay đổi hội thoại theo world state.
- QuestEngine kiểm tra điều kiện.
- SceneManager hiển thị đúng vật thể.
- InteractionSystem kích hoạt thay đổi hợp lệ.

Ví dụ:
Khi garden.restoration.stage >= 3, Bác Lâm có hội thoại mới.

Khi mainHall.lantern.restored = true, Chú Tiểu An mở khóa chương tiếp theo.

Không hardcode toàn bộ logic vào một file Scene.

## 7. Renderer và animation

Thiết kế các trạng thái hiển thị riêng cho vật thể.

Hỗ trợ:
- Sprite theo trạng thái.
- Animation chuyển trạng thái.
- Particle.
- Lighting.
- Ambient audio.
- Vật thể xuất hiện hoặc biến mất.
- Thay đổi collision khi cần.

Không làm giật camera, không tạo loop animation trùng lặp.

Có tùy chọn giảm hiệu ứng trên thiết bị yếu.

## 8. SQLite

Thiết kế migration cho world state.

Yêu cầu:
- Có primary key phù hợp.
- Không ghi database mỗi frame.
- Chỉ lưu các thay đổi cần thiết.
- Có transaction cho thay đổi nhiều bước.
- Có cơ chế khôi phục khi server restart.
- Không mất dữ liệu cũ.
- Có quy tắc dọn trạng thái tạm đã hết hạn.

## 9. Socket.IO

Server là nguồn xác thực trạng thái.

Hỗ trợ:
- Yêu cầu tương tác.
- Kiểm tra khoảng cách và điều kiện.
- Xác nhận thay đổi.
- Broadcast world state delta.
- Đồng bộ snapshot cho người vào phòng muộn.
- Reconnect.
- Chống cập nhật trùng.
- Chống người chơi tự mở khóa trạng thái.

Không broadcast toàn bộ thế giới mỗi frame.

## 10. Kiểm thử nghiệm thu

Kiểm tra:
- Hành động thực sự làm thay đổi hình ảnh trên Canvas.
- Hai trình duyệt thấy cùng trạng thái trong cùng phòng.
- Người vào sau nhận trạng thái đúng.
- Reload giữ các thay đổi lâu dài.
- Restart server không làm mất thay đổi đã lưu.
- Trạng thái cá nhân không rò rỉ sang người khác.
- Trạng thái phòng không rò rỉ sang phòng khác.
- NPC và nhiệm vụ phản ứng đúng.
- Không giảm FPS nghiêm trọng.

## 11. Thứ tự triển khai

1. Audit và thiết kế state model.
2. WorldStateManager.
3. SQLite migration.
4. Socket.IO synchronization.
5. Phản ứng tức thì.
6. Khôi phục khu vườn.
7. Ánh sáng Chánh điện.
8. Kết nối NPC và QuestEngine.
9. Animation, âm thanh, kiểm thử.

Sau mỗi bước phải giữ dự án chạy được.

Cập nhật IMPLEMENTATION_PROGRESS.md và HANDOFF.md.

Hãy trực tiếp triển khai trong workspace hiện tại, không dừng ở tài liệu thiết kế.

# PROMPT 4/5 — SÂN MÂY 2.0: 20-MINUTE STORY-DRIVEN GAMEPLAY EXPERIENCE

Bạn là Senior Game Director, Narrative Designer, UX Designer và Full-stack Game Developer.

## Mục tiêu

Tôi muốn SÂN MÂY có một trải nghiệm chơi khoảng 20 phút thực sự hấp dẫn, có mở đầu, khám phá, tương tác, hợp tác, cao trào và kết thúc.

Không thiết kế thành danh sách nhiệm vụ lặp lại.

Không tạo áp lực thời gian, điểm số, streak hay yêu cầu đăng nhập hằng ngày.

Người chơi phải có cảm giác:
- Mình đang khám phá một câu chuyện.
- Những hành động của mình có ý nghĩa.
- Có điều thú vị để làm cùng bạn bè.
- Thế giới đã thay đổi sau khi mình tham gia.
- Mình muốn quay lại để xem câu chuyện tiếp diễn.

## 1. Kiểm tra các hệ thống hiện tại

Đọc:
- IMPLEMENTATION_PROGRESS.md.
- HANDOFF.md.
- README.md.
- Source code của StoryEngine nếu đã có.
- CooperativeSessionManager nếu đã có.
- WorldStateManager nếu đã có.
- SceneManager.
- QuestEngine.
- NPC dialogue.
- Chánh điện và các hoạt động tu tập.

Không tự giả định các phần nâng cấp trước đã hoàn thành. Nếu thiếu dependency, báo cáo rõ và triển khai phần tối thiểu cần thiết.

## 2. Tạo hành trình đầu tiên

Tên hành trình:

"ÁNH SÁNG TRONG CHÁNH ĐIỆN"

Thời lượng mục tiêu: 15–25 phút cho người chơi mới.

Hành trình gồm 5 giai đoạn.

### Giai đoạn 1 — Lời nhắn của Chú Tiểu (0–3 phút)

Người chơi xuất hiện ở sân chùa.

Chú Tiểu An tiến đến hoặc có dấu hiệu muốn trò chuyện.

Chú Tiểu kể rằng một chiếc đèn cổ trong Chánh điện đã lâu không được thắp sáng.

Người chơi có thể:
- Hỏi về chiếc đèn.
- Hỏi về lịch sử ngôi chùa.
- Nhận lời giúp đỡ.
- Tạm thời từ chối và quay lại sau.

Tạo animation và hội thoại ngắn, không dùng một đoạn văn dài.

### Giai đoạn 2 — Tìm manh mối (3–7 phút)

Người chơi đến thư viện.

Tương tác với Thầy Minh và một cuốn sách cũ.

Có một câu đố khám phá nhẹ:
- Tìm đúng trang sách.
- Đọc ký hiệu hoặc manh mối.
- Kết nối thông tin với vị trí trong Chánh điện.

Không yêu cầu kiến thức Phật giáo chuyên sâu để giải đố.

Khi hoàn thành, cập nhật nhật ký và mở khóa bước tiếp theo.

### Giai đoạn 3 — Chuẩn bị Chánh điện (7–11 phút)

Người chơi đến Chánh điện.

Có thể:
- Dâng hoa.
- Thắp nến.
- Đọc một đoạn suy ngẫm ngắn.
- Tìm vị trí chiếc đèn cổ.

Mỗi hoạt động có animation và phản ứng môi trường.

Không bắt buộc hoàn thành 108 lần lạy hoặc ngồi thiền nhiều phút để tiếp tục câu chuyện.

### Giai đoạn 4 — Hoạt động cùng bạn (11–16 phút)

Người chơi mời một người bạn.

Hai người cùng chuẩn bị và đặt chiếc đèn cổ vào vị trí.

Mỗi người có vai trò:
- Người A giữ hoặc chuẩn bị đèn.
- Người B tìm vị trí và hoàn thành bước còn lại.

Hai người phải trao đổi thông tin hoặc phối hợp.

Nếu không có bạn online, cho phép NPC hỗ trợ với một phiên bản solo hợp lý.

Không khóa câu chuyện chỉ vì thiếu người chơi thứ hai.

### Giai đoạn 5 — Khoảnh khắc kết thúc (16–20 phút)

Khi hoàn thành:
- Chiếc đèn cổ sáng lên.
- Ánh sáng trong Chánh điện thay đổi nhẹ.
- Có animation và âm thanh đặc biệt.
- NPC phản ứng.
- WorldStateManager lưu trạng thái.
- Người chơi nhận một vật phẩm kỷ niệm.
- Nhật ký ghi lại câu chuyện.
- Mở khóa gợi ý về chương tiếp theo.

Tạo một đoạn kết ngắn có cảm xúc, không chỉ hiển thị "Quest Complete".

## 3. JourneyDirector

Thiết kế module điều phối hành trình.

Hỗ trợ:
- Các giai đoạn.
- Điều kiện bắt đầu.
- Điều kiện hoàn thành.
- Sự kiện kích hoạt.
- Hội thoại.
- Cập nhật thế giới.
- Phần thưởng.
- Checkpoint.
- Resume sau reload.
- Tạm dừng và tiếp tục.
- Bỏ qua hoạt ảnh đã xem.

Hành trình phải data-driven, tránh hardcode toàn bộ trong Game.js.

## 4. Hướng dẫn người chơi

Thiết kế onboarding tự nhiên:
- NPC hướng dẫn thay vì popup liên tục.
- Đánh dấu mục tiêu nhẹ nhàng.
- Có gợi ý sau khi người chơi không biết làm gì.
- Có thể mở nhật ký để xem mục tiêu.
- Không tự động dịch chuyển người chơi qua các bản đồ.
- Không khóa camera quá lâu.
- Có thể bỏ qua hội thoại đã xem.

## 5. Cảm xúc và nhịp độ

Thiết kế nhịp độ:
- Mở đầu: tò mò.
- Khám phá: nhẹ nhàng.
- Tương tác: thư giãn.
- Hợp tác: kết nối.
- Kết thúc: ấm áp, đáng nhớ.

Không biến game thành cuộc đua.

Âm thanh, ánh sáng và animation phải hỗ trợ cảm xúc của từng giai đoạn.

## 6. Nội dung chơi lại

Sau khi hoàn thành:
- Người chơi vẫn được tự do khám phá.
- NPC có hội thoại mới.
- Chánh điện giữ trạng thái đã thay đổi.
- Có thể xem lại câu chuyện trong nhật ký.
- Có thể giúp một người bạn khác trải nghiệm.
- Không nhận phần thưởng độc nhất nhiều lần.

Không bắt buộc làm lại hành trình để giữ tiến trình.

## 7. Multiplayer

Hỗ trợ:
- Người chơi đang ở các giai đoạn khác nhau.
- Mời bạn vào hoạt động chung.
- Không ghi đè tiến trình cá nhân.
- Người vào sau nhận trạng thái thế giới phù hợp.
- Một người disconnect không làm hỏng hành trình.
- Trạng thái câu chuyện và hoạt động chung được server xác thực.

## 8. UI/UX

Tạo Journey UI tối giản:
- Tên chương.
- Mục tiêu hiện tại.
- Nhật ký.
- Gợi ý.
- Thông báo mở khóa.
- Chuyển cảnh.
- Khoảnh khắc kết thúc.

Không làm HUD quá nhiều nút.

Hỗ trợ desktop và mobile.

## 9. Đánh giá trải nghiệm

Tạo hệ thống telemetry nhẹ, ưu tiên quyền riêng tư.

Chỉ thu thập các sự kiện cần thiết:
- Journey started.
- Stage completed.
- Journey completed.
- Journey abandoned.
- Cooperative activity started/completed.
- Thời lượng chủ động theo giai đoạn.

Không ghi nội dung chat hoặc lời nguyện riêng tư vào telemetry.

Tạo thống kê đơn giản cho chủ dự án để biết:
- Người chơi thường dừng ở giai đoạn nào.
- Thời gian hoàn thành.
- Tỷ lệ hoàn thành.
- Tỷ lệ chơi cùng bạn.

## 10. Kiểm thử nghiệm thu

Phải chạy thử toàn bộ hành trình:
- Từ người chơi mới.
- Từ người chơi đã có tiến trình.
- Một người chơi solo.
- Hai người chơi cùng nhau.
- Refresh giữa hành trình.
- Disconnect khi đang hợp tác.
- Restart server.
- Hoàn thành và chơi lại.

Kiểm tra:
- Không có bước bị kẹt.
- Không có nhiệm vụ bất khả thi.
- Không có nút giả.
- Không có đoạn hội thoại thiếu.
- Thời lượng mục tiêu hợp lý.
- Người chơi không cần spam phím.
- Phần thưởng và thay đổi thế giới thực sự tồn tại.

## 11. Triển khai

1. Audit các hệ thống đã có.
2. Thiết kế JourneyDirector.
3. Viết toàn bộ nội dung hành trình.
4. Tích hợp NPC và thư viện.
5. Tích hợp Chánh điện.
6. Tích hợp hoạt động hợp tác.
7. Tích hợp WorldStateManager.
8. Hoàn thiện UI/animation/audio.
9. Playtest tự động và thủ công.
10. Cập nhật tài liệu tiến độ.

Không tự tuyên bố trải nghiệm hấp dẫn hoặc đạt đúng 20 phút chỉ dựa trên automated tests. Phải phân biệt thời lượng thiết kế và thời lượng đo từ playtest thật.

Hãy trực tiếp triển khai một hành trình hoàn chỉnh, không chỉ tạo bản demo hoặc tài liệu.


# PROMPT 5/5 — SÂN MÂY 2.0: ADVANCED MAIN HALL EXPERIENCE

Bạn là Senior Game Developer, Interaction Designer, 2D Animation Developer và Full-stack Engineer.

## Bối cảnh

SÂN MÂY là game chùa ảo 2D multiplayer chạy trên HTML/CSS/JavaScript, Canvas 2D, Node.js, Express, Socket.IO và SQLite.

Theo IMPLEMENTATION_PROGRESS.md, game đã có Chánh điện, lạy Phật 108 lần, lần chuỗi 108 hạt, thiền, chắp tay và tụng kinh.

Tôi muốn Chánh điện trở thành khu vực được đầu tư kỹ nhất trong game, có chiều sâu tương tác, hoạt ảnh đẹp, âm thanh sống động và những trải nghiệm có ý nghĩa.

Không thay thế chức năng hiện tại bằng mockup.

Không biến nghi thức tôn giáo thành trò chơi tốc độ, combo, điểm số hay cạnh tranh.

## 1. Audit Chánh điện

Trước khi code:
- Đọc IMPLEMENTATION_PROGRESS.md, HANDOFF.md, README.md.
- Kiểm tra scene Chánh điện.
- Kiểm tra hệ thống lạy, lần chuỗi, thiền, tụng kinh.
- Kiểm tra animation và sprite.
- Kiểm tra AudioManager.
- Kiểm tra UI và HUD.
- Kiểm tra dữ liệu tiến trình.
- Kiểm tra hệ thống multiplayer.

Xác định chức năng nào cần mở rộng, chức năng nào có thể giữ nguyên.

## 2. Thiết kế lại bố cục Chánh điện

Chánh điện phải có các khu vực tương tác rõ ràng:
- Bàn thờ chính.
- Khu vực lạy.
- Khu vực lần chuỗi.
- Góc đọc và tụng kinh.
- Khu vực thiền.
- Bàn dâng hoa.
- Khu vực thắp nến.
- Sổ cầu nguyện.
- Một vật thể đặc biệt phục vụ cốt truyện.

Yêu cầu:
- Kiến trúc chùa Việt Nam cách điệu.
- Không gian trang nghiêm, yên bình.
- Ánh sáng vàng ấm.
- Nến có animation.
- Bóng đổ mềm.
- Các vật thể có chiều sâu.
- Nhân vật không đi xuyên bàn thờ, cột hoặc tượng.
- Camera và collision hoạt động chính xác.
- Tương tác bằng E hoặc chạm.
- Không có quá nhiều nút nổi che Canvas.

## 3. Nâng cấp lạy Phật

Giữ tiến trình 108 lần hiện tại.

Bổ sung:
- Chọn phiên 9, 27, 54 hoặc 108 lần.
- Animation nhiều giai đoạn: đứng, chắp tay, quỳ, cúi, đứng dậy.
- Mỗi lần hoàn thành có phản hồi nhẹ.
- Có nhịp animation tự nhiên.
- Có thể tạm dừng.
- Có thể tiếp tục.
- Có thể kết thúc sớm.
- Có chế độ tập trung ẩn HUD.
- Có âm thanh môi trường phù hợp.
- Lưu tiến trình đúng.

Chỉ ghi nhận một lần lạy khi animation và điều kiện hợp lệ hoàn thành.

Không cho spam event để tăng số lần.

Không hiển thị bảng xếp hạng số lần lạy.

## 4. Nâng cấp lần chuỗi 108 hạt

Tạo giao diện chuỗi hạt tương tác trực quan.

Yêu cầu:
- Hiển thị chuỗi hạt với 108 vị trí logic.
- Hạt hiện tại được làm nổi bật.
- Mỗi lần tương tác chuyển đúng một hạt.
- Có animation chuyển hạt.
- Có âm thanh nhẹ, không lặp gây khó chịu.
- Có thể thao tác bằng bàn phím, chuột hoặc cảm ứng.
- Có thể tạm dừng và tiếp tục.
- Lưu tiến trình.
- Có phản hồi riêng khi hoàn thành một vòng.

Không chỉ hiển thị con số 0/108.

## 5. Đọc và tụng kinh tương tác

Xây dựng ReadingExperience hoặc mở rộng hệ thống hiện tại.

Chức năng:
- Danh sách nội dung đọc.
- Màn hình đọc dễ nhìn.
- Điều chỉnh kích thước chữ.
- Chế độ đọc từng đoạn.
- Đánh dấu đoạn đang đọc.
- Cuộn tự động tùy chọn.
- Tốc độ cuộn tùy chỉnh.
- Lưu vị trí đọc.
- Bookmark.
- Giải thích thuật ngữ.
- Chế độ nghe nếu có audio hợp lệ.
- Tùy chọn tắt âm thanh.

Nội dung kinh điển và bản thu phải có nguồn và quyền sử dụng phù hợp.

Không tự tạo lời kinh rồi gán cho Đức Phật hoặc kinh điển có thật.

Nếu chưa có audio được phép sử dụng, để tính năng nghe ở trạng thái chưa triển khai rõ ràng; không tạo nút phát giả.

## 6. Thiền định nâng cao

Giữ các phiên thiền hiện có.

Bổ sung:
- Chế độ tập trung.
- Animation nhân vật ngồi thiền.
- Hiệu ứng hít thở nhẹ.
- Âm thanh thiên nhiên.
- Điều chỉnh âm lượng.
- Chuyển camera mềm.
- Ánh sáng môi trường thay đổi tinh tế.
- Kết thúc bằng tiếng chuông nhẹ nếu người chơi bật tùy chọn.
- Có thể thoát bất kỳ lúc nào.

Không sử dụng hiệu ứng nhấp nháy mạnh.

Không bắt buộc giữ tab foreground liên tục.

## 7. Dâng hoa

Tạo hoạt động dâng hoa có thao tác thực.

Luồng:
1. Người chơi đến bàn hoa.
2. Chọn loại hoa có sẵn.
3. Nhân vật nhận hoa.
4. Di chuyển đến vị trí dâng hoa.
5. Animation đặt hoa.
6. Hoa xuất hiện trên bàn lễ.
7. NPC hoặc môi trường có phản hồi phù hợp.

Hoa phải tồn tại trong world state theo phạm vi được thiết kế.

Có thể có các loại hoa trang trí khác nhau, nhưng không tạo tiền tệ phức tạp.

## 8. Thắp nến

Tạo hệ thống nến:
- Nến chưa thắp.
- Nến đang cháy.
- Nến đã tắt.

Người chơi có thể:
- Chọn một vị trí hợp lệ.
- Thắp nến.
- Quan sát animation ngọn lửa.
- Nhìn thấy ánh sáng ảnh hưởng môi trường.

Người chơi khác trong phòng nhìn thấy nến đã thắp.

Có giới hạn số nến và thời gian tồn tại để tránh quá tải.

## 9. Sổ cầu nguyện

Tạo một cuốn sổ trong Chánh điện.

Người chơi có thể:
- Viết lời nguyện riêng tư.
- Viết lời chúc công khai nếu chủ động chọn.
- Xem lại nội dung riêng của mình.
- Xem nội dung công khai được phép hiển thị.
- Xóa nội dung riêng của mình.
- Báo cáo nội dung công khai không phù hợp.

Không công khai lời nguyện riêng tư.

Không dùng innerHTML trực tiếp với nội dung người chơi.

Có giới hạn độ dài, rate limit và kiểm tra dữ liệu.

Tái sử dụng hệ thống lời chúc hiện tại nếu phù hợp.

## 10. Nghi thức chung

Hỗ trợ ít nhất:
- Thiền chung hai người.
- Cùng đọc một nội dung.
- Cùng chuẩn bị và thắp đèn trong một câu chuyện.

Yêu cầu:
- Lời mời.
- Chấp nhận.
- Trạng thái sẵn sàng.
- Đồng bộ animation.
- Đồng hồ server nếu có thời lượng.
- Xử lý disconnect.
- Kết thúc phiên.
- Không làm mất tiến trình cá nhân.

Tái sử dụng CooperativeSessionManager nếu đã được triển khai.

## 11. Cốt truyện trong Chánh điện

Thêm một vật thể đặc biệt: Chiếc đèn cổ.

Chiếc đèn có các trạng thái:
- Chưa khám phá.
- Đã tìm manh mối.
- Đang chuẩn bị.
- Đã khôi phục.
- Đang tỏa sáng.

Kết nối với:
- Chú Tiểu An.
- Thầy Minh.
- StoryEngine.
- WorldStateManager.
- JourneyDirector.

Nếu các module này chưa tồn tại, báo cáo dependency và thiết kế interface tương thích. Không tạo hệ thống giả.

## 12. Animation và âm thanh

Yêu cầu:
- Animation mượt.
- Chuyển trạng thái nhân vật hợp lý.
- Ánh sáng nến.
- Hương khói nhẹ nếu phù hợp.
- Bụi sáng rất nhẹ.
- Tiếng bước chân trên nền gỗ.
- Tiếng chuông.
- Âm thanh môi trường yên tĩnh.
- Không autoplay âm thanh trước tương tác hợp lệ.
- Không sử dụng audio không rõ quyền sử dụng.

Có tùy chọn giảm hiệu ứng.

Ưu tiên chất lượng hơn số lượng particle.

## 13. UI/UX

Thiết kế theo nguyên tắc:
- Canvas chiếm phần lớn màn hình.
- HUD tối giản.
- Chỉ hiện hướng dẫn khi đến gần vật thể.
- Panel có thể đóng nhanh.
- Không che nhân vật.
- Hỗ trợ fullscreen.
- Hỗ trợ desktop và mobile.
- Có trạng thái loading và phản hồi thao tác.
- Có khả năng điều chỉnh âm lượng.
- Tương tác phải dễ hiểu ngay lần đầu.

## 14. Backend và SQLite

Tái sử dụng các bảng hiện tại khi phù hợp.

Bổ sung dữ liệu cần thiết cho:
- Phiên lạy.
- Phiên lần chuỗi.
- Bookmark đọc.
- Dâng hoa.
- Trạng thái nến.
- Lời nguyện riêng tư.
- Phiên thiền chung.
- Trạng thái chiếc đèn cổ.

Không lưu mỗi frame animation vào database.

Dữ liệu quan trọng phải được server xác thực.

## 15. Kiểm thử nghiệm thu

Phải kiểm tra:
- Lạy đúng số lần.
- Lần chuỗi đúng 108 hạt.
- Tạm dừng và tiếp tục.
- Reload giữ tiến trình.
- Đọc kinh lưu bookmark.
- Hoa thực sự xuất hiện trên bàn lễ.
- Nến thực sự phát sáng.
- Hai người cùng nhìn thấy thay đổi.
- Lời nguyện riêng tư không bị lộ.
- Thiền chung hoạt động.
- Không thể spam để nhận tiến trình.
- Collision không bị hỏng.
- Không giảm FPS nghiêm trọng.
- Không có lỗi console trong các luồng đã thử.
- Không làm hỏng các hoạt động Chánh điện cũ.

## 16. Thứ tự triển khai

1. Audit Chánh điện.
2. Nâng bố cục và vật thể tương tác.
3. Nâng cấp lạy Phật.
4. Nâng cấp lần chuỗi.
5. Đọc và tụng kinh.
6. Thiền định.
7. Dâng hoa.
8. Thắp nến.
9. Sổ cầu nguyện.
10. Nghi thức chung.
11. Chiếc đèn cổ và tích hợp cốt truyện.
12. Animation, âm thanh và polish.
13. Kiểm thử desktop/mobile và multiplayer.

Không viết lại toàn bộ game.

Không xóa tính năng hiện tại.

Sau mỗi bước:
- Liệt kê file đã sửa.
- Chạy kiểm thử.
- Báo cáo chức năng hoàn thành.
- Báo cáo phần chưa hoàn thành.
- Cập nhật IMPLEMENTATION_PROGRESS.md và HANDOFF.md.

Hãy trực tiếp phân tích source code và triển khai trong workspace hiện tại.