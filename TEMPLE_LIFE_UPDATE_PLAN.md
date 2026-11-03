# SÂN MÂY — TEMPLE LIFE UPDATE

**Tài liệu triển khai một lượt cho AI Coding**  
**Trạng thái:** APPROVED FOR IMPLEMENTATION (chưa xác nhận đã code/test)  
**Repository:** https://github.com/leem8888/san-may  
**Phạm vi:** 5 tính năng mới, tích hợp vào game hiện tại, không viết lại dự án.

> **LỆNH THỰC THI CHO AI CODING:** Hãy đọc toàn bộ tài liệu này, kiểm tra source mới nhất của repository và **trực tiếp triển khai tất cả hạng mục trong một lượt làm việc**. Tự chia công việc thành các bước nội bộ, thực hiện tuần tự, chạy test sau mỗi bước, sửa lỗi và chạy regression cuối cùng. Không dừng lại sau khi chỉ lập kế hoạch. Không tuyên bố hoàn tất khi chưa có bằng chứng chạy thử. Nếu gặp điểm chưa được quyết định, chọn phương án tối thiểu, an toàn, phù hợp kiến trúc hiện có; ghi lại quyết định. Chỉ hỏi người dùng khi gặp blocker không thể xử lý an toàn.

---

## 1. Mục tiêu sản phẩm

Bổ sung các sinh hoạt chùa Việt Nam vào Sân Mây:

1. **Mua cá phóng sinh:** NPC bán cá ở **ngoài cổng chùa**; người chơi mua cá, mang tới vị trí phóng sinh phù hợp, thả cá với animation và cập nhật inventory.
2. **Cầu duyên và rút thẻ:** Đặt **bàn cầu duyên tại một góc sân**; tương tác để cầu duyên và rút thẻ, nhận nội dung mang tính gợi mở, có thể lưu vào nhật ký.
3. **Nhân vật nam/nữ và NPC cạo đầu:** Phân biệt nam/nữ rõ ràng trong màn tạo nhân vật; **không cho chọn cạo đầu trực tiếp tại bước tạo account**. Người chơi phải gặp NPC để quyết định. Sau khi cạo đầu, nhân vật nam mang danh hiệu **“Chú tiểu”**, nhân vật nữ mang danh hiệu **“Tiểu ni”**, hiển thị trên đầu và đồng bộ multiplayer.
4. **Cất dép trước Chánh Điện:** Người chơi cất dép vào tủ/kệ trước khi vào Chánh Điện, vào trong với ngoại hình chân trần, có thể lấy lại dép khi ra.
5. **Quét rác có nhân vật:** Sửa animation quét sân hiện tại: hiển thị chính nhân vật cầm chổi và thực hiện động tác quét, không còn cảnh chỉ thấy cây chổi tự chuyển động.

### Nguyên tắc trải nghiệm

- Phong cách nhẹ nhàng, tôn trọng văn hóa và không gian chùa Việt Nam.
- Các nghi thức trong game là trải nghiệm nhập vai, không phải chứng nhận vai trò tôn giáo ngoài đời.
- Cầu duyên không hứa hẹn kết quả tình cảm; nội dung thẻ mang tính chiêm nghiệm, không bói toán khẳng định tương lai.
- Phóng sinh chỉ là mô phỏng; không thiết kế thưởng công đức theo số cá mua/thả. Có thể lồng ghép thông điệp bảo vệ môi trường, không khuyến khích đánh bắt động vật để phóng sinh ngoài đời.
- Không tạo cơ chế kiếm tiền thật hoặc pay-to-win từ các hoạt động này.

---

## 2. Gate 0 — Khảo sát source trước khi sửa

**Bắt buộc kiểm tra source thực tế, không coi các tên module dưới đây là API chắc chắn tồn tại.**

1. Xác định nhánh, HEAD commit, working tree, scripts và công nghệ thực tế.
2. Đọc README, tài liệu kiến trúc, hướng dẫn chạy, kế hoạch game, tài liệu handoff và QA (nếu có).
3. Xác định nơi thực hiện: đăng ký/đăng nhập, character creator, lưu avatar, render nhân vật local/remote, nameplate, NPC, interactions, scene transitions, collision, inventory, currency, minigames, quét sân, nhật ký, Socket.IO và database migrations.
4. Kiểm tra các module có thể liên quan như `CharacterCreator`, `CharacterArt`, `SpriteRenderer`, `InteractionSystem`, `MinigameHost`, `WorldStateStore` **nếu thực sự có trong source**.
5. Kiểm tra các khu vực hiện có: cổng chùa, sân, Chánh Điện, Hồ Sen hoặc địa điểm thả cá phù hợp. Không tự tạo scene trùng nếu đã có.
6. Chạy baseline test và build; ghi số bài PASS/FAIL trước khi sửa. Nếu baseline đã lỗi, ghi rõ lỗi có sẵn và đánh giá ảnh hưởng.
7. Kiểm tra schema và cơ chế migration hiện hành; không đoán tên bảng hoặc trường.
8. Tạo nhánh làm việc `feature/temple-life-update` nếu phù hợp với quy trình hiện tại. Không force push, không reset hoặc xóa thay đổi chưa commit.

**Đầu ra Gate 0:** bản đồ module cần sửa, kế hoạch migration, danh sách rủi ro và thứ tự thực hiện. Sau đó **tiếp tục code ngay trong cùng lượt làm việc**.

---

## 3. Thiết kế kỹ thuật chung

- **Tái sử dụng hệ thống hiện có**: interaction, NPC, minigame, inventory, money/points, avatar, sprite, Socket.IO, persistence.
- **Server authoritative** với các hành động ảnh hưởng tài khoản, tài sản, inventory, danh hiệu, trạng thái vào Chánh Điện và lịch sử.
- **Client** chịu trách nhiệm preview, animation, hiệu ứng và phản hồi UI; không được tự quyết định kết quả giao dịch hoặc danh hiệu.
- **Multiplayer**: local và remote clients phải thấy trạng thái phù hợp; chỉ broadcast thông tin cần thiết, không lộ lời cầu duyên riêng tư.
- **Idempotency** cho hành động mua cá, thả cá, cạo đầu và các cập nhật trạng thái quan trọng; chống double click, retry, reconnect và hai tab.
- **Persistence**: mọi dữ liệu cần lưu phải qua schema/migration tương thích dữ liệu cũ; không reset database, không xóa tài khoản.
- **Asset**: ưu tiên dùng art pipeline hiện có; tạo asset mới nhất quán về tỷ lệ, góc nhìn, palette và animation. Không sử dụng ảnh bên ngoài chưa rõ quyền sử dụng.
- **Accessibility**: UI có nhãn tiếng Việt rõ ràng, thao tác được bằng các cơ chế input hiện có, không chỉ dựa vào màu sắc.

---

## 4. Module A — NPC bán cá và phóng sinh

### A1. Vị trí và giao diện

- Đặt NPC bán cá **bên ngoài cổng chùa**; không cản lối đi hoặc điểm spawn.
- NPC có tên và hội thoại ngắn, ví dụ “Người bán cá”; có biển/đồ vật gợi nhận biết quầy.
- Tương tác NPC mở panel mua cá, hiển thị loại cá, giá, số dư, số lượng và nút xác nhận.
- Sử dụng **đồng tiền/vật phẩm hiện có** nếu source có; không tự tạo ví thứ hai. Nếu game chưa có hệ thống mua bán, bổ sung giao dịch tối thiểu và migration rõ ràng.

### A2. Gameplay

- MVP chỉ cần **một loại cá phóng sinh**, số lượng mua 1 hoặc nhiều trong giới hạn hợp lý.
- Sau mua, cá là vật phẩm thuộc inventory của người chơi.
- Tạo/đánh dấu điểm thả cá tại **Hồ Sen hoặc khu nước hợp lý** theo bản đồ thực tế; không cho thả tại vị trí bất kỳ.
- Khi thả: xác thực có cá, ở đúng scene/vị trí, trừ cá **một lần**, phát animation nhân vật thả cá → cá chạm nước → bơi đi; ghi nhật ký hoạt động nếu game có nhật ký.
- Có thông báo hoàn thành; người cùng scene thấy hoạt ảnh phù hợp, không cần đồng bộ từng frame cá.
- Nếu giao dịch lỗi, không trừ tiền hoặc cá; nếu animation lỗi sau khi server xác nhận, trạng thái inventory vẫn đúng.

### A3. Chống gian lận và giới hạn

- Server kiểm tra account, ownership, khoảng cách tương tác, scene, giá, số dư, số lượng, inventory capacity và request ID.
- Không thể mua với giá client tự gửi, mua số âm, thả cá không sở hữu hoặc thả một con hai lần.
- Không cộng điểm công đức dựa trên tiền mua hoặc số lượng cá thả.

### A4. Nghiệm thu

- Mua thành công → số dư giảm đúng, inventory tăng đúng.
- Thả thành công → inventory giảm đúng, animation xuất hiện, nhật ký đúng.
- Double click, hai tab, reconnect, reload, tài khoản khác đều không nhân đôi tài nguyên.

---

## 5. Module B — Bàn cầu duyên và rút thẻ

### B1. Vị trí

- Đặt **bàn cầu duyên tại một góc sân**, vị trí dễ thấy nhưng không chắn lối đi, khu quét sân, cổng và tương tác khác.
- Bàn có vật thể nhận diện: mặt bàn gỗ, ống thẻ, hoa hoặc đồ trang trí phù hợp phong cách hiện tại.
- Không tự ý thay đổi cấu trúc Chánh Điện để đặt bàn cầu duyên; đây là một góc sân như đã chốt.

### B2. Luồng tương tác

1. Người chơi tới gần bàn và bấm tương tác.
2. Hiển thị lựa chọn **“Cầu duyên”** và **“Rút thẻ cầu duyên”**.
3. Cầu duyên: nhập lời nguyện tùy chọn hoặc chọn lời nguyện mẫu; **riêng tư theo tài khoản**, không broadcast và không hiển thị công khai.
4. Rút thẻ: animation lắc ống/rút thẻ; nhận 1 thẻ từ bộ nội dung được biên soạn sẵn.
5. Hiển thị mã/tên thẻ, nội dung và lời gợi mở; có nút lưu vào nhật ký nếu kiến trúc hỗ trợ.

### B3. Nội dung thẻ

- Tạo **ít nhất 12 thẻ** tiếng Việt, câu chữ tự nhiên, không lặp máy móc.
- Nội dung hướng tới sự chân thành, tôn trọng, giao tiếp, kiên nhẫn, hiểu bản thân và ranh giới lành mạnh.
- Không khẳng định “chắc chắn gặp người yêu”, “đối phương yêu bạn”, hoặc kết quả số mệnh.
- Không cần gọi AI runtime hay dịch vụ trả phí để tạo thẻ.
- Có thể chọn thẻ ngẫu nhiên phía server; nếu cần chống spam, đặt cooldown nhẹ và hiển thị rõ, không yêu cầu thanh toán để rút thẻ tốt.

### B4. Dữ liệu và bảo mật

- Lưu lịch sử thẻ theo tài khoản nếu hệ thống nhật ký hỗ trợ; nếu thêm schema thì dùng migration.
- Không lưu lời nguyện nhạy cảm nếu không cần; nếu lưu, đặt giới hạn độ dài, chỉ tài khoản sở hữu đọc được, có cơ chế xóa/chỉnh sửa phù hợp.
- Validate nội dung nhập, chống XSS, HTML injection và lạm dụng payload.
- Multiplayer chỉ thấy animation người khác đang rút thẻ, **không thấy nội dung lời nguyện hoặc kết quả riêng tư**.

### B5. Nghiệm thu

- Bàn xuất hiện đúng góc sân, có collision/interaction phù hợp.
- Rút thẻ nhận nội dung hợp lệ; lưu/đọc lại nhật ký đúng.
- Không lộ lời nguyện hoặc thẻ riêng tư sang tài khoản khác.

---

## 6. Module C — Tạo nhân vật nam/nữ, NPC cạo đầu và danh hiệu

### C1. Màn tạo tài khoản / tạo nhân vật

- Làm rõ hai lựa chọn **Nam** và **Nữ** với nhãn, preview và ngoại hình dễ phân biệt trong art style hiện tại.
- Không chỉ phân biệt bằng một màu quần áo; thể hiện rõ ở preview tóc, dáng/biến thể sprite và nhãn UI, tránh rập khuôn không cần thiết.
- Tôn trọng dữ liệu người chơi cũ: nếu trường giới tính/appearance đã tồn tại, migrate và map an toàn; không tự đoán giới tính của tài khoản cũ.
- Nếu tài khoản cũ chưa có lựa chọn, cung cấp bước chọn bổ sung một lần khi đăng nhập hoặc trong phần chỉnh nhân vật, **không khóa tài khoản hay xóa avatar**.
- **Không có lựa chọn “cạo đầu” trực tiếp ở màn tạo account**. Cạo đầu là hành động gameplay tại NPC.

### C2. NPC cạo đầu

- Tạo hoặc mở rộng NPC phù hợp trong khuôn viên chùa, với hội thoại rõ ràng.
- Tương tác NPC → giới thiệu lựa chọn → preview đầu cạo → hộp xác nhận cuối cùng.
- Chỉ khi người chơi xác nhận, server mới cập nhật trạng thái đầu cạo và danh hiệu.
- Không tự động cạo đầu khi chỉ nói chuyện hoặc mở preview.
- Không cho client tự gửi danh hiệu bất kỳ.

### C3. Quy tắc danh hiệu **đã chốt, không tự ý thay đổi**

| Giới tính nhân vật | Sau khi NPC cạo đầu | Danh hiệu trên đầu |
|---|---|---|
| Nam | Đầu cạo | **Chú tiểu** |
| Nữ | Đầu cạo | **Tiểu ni** |

- Trước khi cạo đầu: không hiển thị hai danh hiệu này.
- Danh hiệu được **server suy ra** từ giới tính đã lưu và trạng thái cạo đầu; không tin title do client gửi.
- Hiển thị danh hiệu **phía trên tên người chơi**, đủ rõ nhưng không che sprite hoặc UI.
- Người cùng phòng nhìn thấy danh hiệu, đầu cạo và các thay đổi ngoại hình đúng.
- Danh hiệu mang tính nhập vai trong game, không chứng nhận địa vị tu hành ngoài đời.

### C4. Trạng thái lâu dài

- Sau reload/reconnect/login lại vẫn giữ đầu cạo và danh hiệu.
- Khi đã cạo, không tự ý cho phục hồi tóc miễn phí qua Character Creator; nếu có tính năng đổi kiểu tóc hiện hữu, phải khóa hoặc quy định rõ trường hợp đầu cạo để không mâu thuẫn trạng thái.
- **MVP coi việc cạo đầu là lựa chọn lâu dài**, không tự thêm tính năng hoàn tác nếu chưa có yêu cầu. Có thể ghi hướng mở rộng trong tương lai.
- Nếu người chơi được phép thay đổi giới tính/ngoại hình trong source hiện có, bảo đảm danh hiệu được tính lại nhất quán; không phát sinh trường hợp nam mang “Tiểu ni” hoặc nữ mang “Chú tiểu” do dữ liệu cũ.

### C5. Nghiệm thu

- Tạo mới Nam/Nữ đúng preview và persistence.
- Chưa gặp NPC → không có danh hiệu.
- Gặp NPC nhưng hủy → không thay đổi.
- Nam xác nhận → đầu cạo + “Chú tiểu”.
- Nữ xác nhận → đầu cạo + “Tiểu ni”.
- Remote player, reload, reconnect, hai tab đều hiển thị đúng.
- Không thể giả mạo danh hiệu bằng payload client.

---

## 7. Module D — Tủ dép trước Chánh Điện

### D1. Bản đồ và tương tác

- Đặt **tủ/kệ dép ngay trước lối vào Chánh Điện**, không chắn hoàn toàn đường đi.
- Khi người chơi tương tác: **“Cất dép”**, có phản hồi hình ảnh/âm thanh nhẹ và cập nhật trạng thái chân trần.
- Chỉ cho vào Chánh Điện sau khi cất dép; kiểm tra ở **điểm chuyển scene hoặc cửa** trên server nếu có kiểm soát scene server-side.
- Khi ra: cho phép **“Lấy dép”** tại tủ và phục hồi ngoại hình mang dép.

### D2. Trạng thái và UX

- Dùng trạng thái đơn giản `wearing` / `stored`, hoặc enum tương đương kiến trúc hiện có.
- Không tạo item dép mới hoặc tiêu hao dép nếu hệ thống hiện tại không quản lý footwear trong inventory.
- Nếu đã cất, tương tác lại không cất trùng; nếu đang mang, không lấy trùng.
- Khi ở trong Chánh Điện phải hiển thị chân trần trong local/remote sprites.
- Trường hợp rời Chánh Điện qua lối khác, reload, reconnect hoặc teleport: **không khóa cứng người chơi**. Định nghĩa quy tắc khôi phục an toàn, ví dụ giữ dép ở tủ đến khi người chơi quay lại hoặc tự trả dép khi rời khu vực bằng cơ chế chuyển scene được kiểm soát; chọn một cách nhất quán và test đầy đủ.
- Với người chơi đang ở trong Chánh Điện từ dữ liệu cũ, có migration/fallback an toàn để không bị mắc kẹt.

### D3. Nghiệm thu

- Chưa cất dép → cửa nhắc cất dép, không vào.
- Đã cất → vào được, chân trần đúng.
- Ra và lấy dép → mang dép trở lại.
- Reload/reconnect, hai tab, teleport hợp lệ không gây soft-lock.
- Không thể bypass quy tắc bằng gửi trực tiếp event chuyển scene.

---

## 8. Module E — Quét rác có nhân vật cầm chổi

### E1. Sửa hành vi hiện có

- Khảo sát minigame quét sân và animation hiện tại; **không viết lại minigame nếu chỉ thiếu render nhân vật**.
- Khi quét, hiển thị **chính avatar của người chơi** đang cầm chổi, không phải chỉ một cây chổi tự chuyển động.
- Chổi được neo theo tay/hướng nhân vật; đúng z-order, không bay rời tay.
- Có animation tối thiểu: chuẩn bị → đưa chổi → lá dịch chuyển → hoàn thành.
- Nếu game có 4 hướng sprite, xử lý hợp lý theo hướng hoặc dùng biến thể tối thiểu không lỗi.

### E2. Multiplayer và input

- Người khác trong cùng scene nhìn thấy nhân vật đang quét và chổi chuyển động.
- Không tạo thêm “bản sao nhân vật” để vẽ cùng lúc với avatar hiện hữu.
- Khi đang quét, khóa/giới hạn input di chuyển theo cơ chế minigame hiện có, không để nhân vật đi khỏi chổi.
- Khi hủy, hoàn tất, chuyển scene hoặc mất kết nối, animation và vật thể tạm được cleanup.
- Không spam network theo từng frame; chỉ đồng bộ state/action cần thiết và client tự chạy animation.

### E3. Nghiệm thu

- Người chơi nhìn thấy thân người + tay + chổi + lá, không còn chổi đơn lẻ.
- Remote client thấy đúng người đang quét.
- Không có avatar trùng, chổi lệch, sprite nhấp nháy hoặc event listener bị đăng ký lặp.
- Minigame vẫn tính kết quả/điểm đúng như trước.

---

## 9. Migration và dữ liệu

- Chỉ tạo migration **nếu schema thực tế cần**; dùng số phiên bản tiếp theo từ repository, không tự đặt version trùng.
- Các dữ liệu có thể cần lưu: giới tính/appearance, `is_shaved`, footwear state, fish inventory/transactions, fortune history. **Không mặc định tạo bảng mới cho dữ liệu đã có**.
- Đặt default an toàn cho tài khoản cũ, đặc biệt `is_shaved = false` nếu chưa có trạng thái và footwear fallback.
- Không reset tài khoản, điểm, tiền, inventory, nhật ký, nhiệm vụ hoặc tiến trình hiện có.
- Backup và thử migration trên bản sao DB có dữ liệu thật/fixture trước khi áp dụng production.
- Kiểm tra unique keys, foreign keys, transaction rollback và idempotency.
- Không commit file DB chứa tài khoản/dữ liệu người chơi thật.

---

## 10. UI, art và trải nghiệm

- Toàn bộ nhãn/hội thoại bằng **tiếng Việt có dấu**, thống nhất giọng điệu game.
- Sprite/animation phải nhất quán tỷ lệ nhân vật, góc camera, pixel density và màu sắc.
- Cửa sổ tương tác không che vùng điều khiển chính; có nút đóng/hủy, loading và error feedback.
- Không hiển thị “Thành công” trước xác nhận server.
- Với nam/nữ: preview cả trước/sau cạo đầu; nameplate không đè lên nhau khi nhiều người đứng gần.
- Với quét sân: có ít nhất animation cơ bản người cầm chổi; nếu thiếu art, phải tạo asset phù hợp hoặc ghi blocker, **không đánh dấu COMPLETE chỉ vì chổi đã chuyển động**.
- Không thêm dependency nặng khi có thể dùng hệ thống hiện hữu.

---

## 11. Automated tests bắt buộc

### A — Phóng sinh
- Mua hợp lệ; không đủ tiền; inventory đầy; giá giả; số lượng âm; request trùng; hai tab.
- Thả hợp lệ; sai khu vực; không có cá; thả trùng; transaction rollback; tài khoản khác.

### B — Cầu duyên
- Rút thẻ có nội dung; bộ thẻ đủ số lượng; cooldown nếu có; nhật ký lưu/đọc đúng.
- Lời nguyện riêng tư không lộ qua Socket.IO/API; payload dài/XSS bị xử lý an toàn.

### C — Nhân vật
- Nam/nữ tạo mới; tài khoản cũ; NPC cancel/confirm; trạng thái đầu cạo; danh hiệu đúng giới tính.
- Payload giả mạo danh hiệu; reload/reconnect; remote snapshot; đồng bộ hai tab.

### D — Cất dép
- Chưa cất không vào; đã cất vào; lấy lại dép; double click; reload; teleport; reconnect; không soft-lock.

### E — Quét sân
- Start/stop/complete; state cleanup; không tạo avatar trùng; giữ logic minigame và điểm hiện tại.

### Regression
- Authentication, character creation, NPC, scene transitions, movement, inventory, economy/points, các minigame khác, multiplayer rooms, persistence.

**Không xóa, skip hoặc sửa test cũ chỉ để đạt PASS.**

---

## 12. Browser QA / Multiplayer QA

Chạy browser thực tế hoặc automation sẵn có, ưu tiên **hai phiên đăng nhập bằng hai tài khoản**.

Kịch bản end-to-end:

1. Tạo nhân vật nam; xác nhận ngoại hình nam rõ ràng.
2. Tạo nhân vật nữ ở tài khoản khác; xác nhận ngoại hình nữ rõ ràng.
3. Nam gặp NPC cạo đầu, chọn hủy: không đổi; chọn đồng ý: hiện **Chú tiểu**.
4. Nữ gặp NPC cạo đầu: hiện **Tiểu ni**.
5. Hai người cùng phòng thấy đúng avatar/danh hiệu của nhau.
6. Đến cổng, mua cá, kiểm tra tiền và inventory.
7. Đến Hồ Sen, thả cá, kiểm tra animation và không thể thả lại cùng vật phẩm.
8. Đến góc sân, tương tác bàn cầu duyên, rút thẻ và kiểm tra quyền riêng tư.
9. Đến Chánh Điện khi chưa cất dép: bị nhắc; cất dép → vào được → ra lấy lại.
10. Quét sân: thấy người cầm chổi; tài khoản còn lại thấy đúng animation.
11. Reload, reconnect, chuyển scene, đăng nhập lại: trạng thái bền vững và không lỗi.
12. Kiểm tra console, network, layout desktop/mobile, FPS và lỗi overlap.

Nếu không có khả năng chạy browser thật, ghi **NOT RUN** và nêu lý do; không ghi PASS giả.

---

## 13. Trình tự triển khai **trong cùng một lượt AI coding**

| Bước | Công việc | Điều kiện qua bước |
|---|---|---|
| 0 | Audit repo, baseline tests, lập mapping | Có danh sách module và migration |
| 1 | Migrations / registries / server actions nền | Tests dữ liệu và quyền sở hữu PASS |
| 2 | Cất dép trước Chánh Điện | Scene + persistence + reconnect PASS |
| 3 | Quét sân có avatar | Local/remote animation + regression PASS |
| 4 | Nam/nữ, NPC cạo đầu, danh hiệu | Cả hai danh hiệu + multiplayer PASS |
| 5 | Bàn cầu duyên, bộ thẻ, nhật ký | Privacy + interaction PASS |
| 6 | NPC mua cá, inventory, thả cá | Atomicity + animation + retry PASS |
| 7 | Full integration, browser QA, fix | Toàn bộ regression và E2E đạt |
| 8 | Docs, changelog, commit, handoff | Có báo cáo và bằng chứng thực tế |

**Một lượt triển khai không có nghĩa là một commit khổng lồ.** Có thể tạo commit theo module để dễ rollback; sau đó cung cấp commit cuối hoặc PR tổng. Không push trực tiếp `main` nếu chưa được phép theo quy trình dự án.

---

## 14. Definition of Done — Chỉ COMPLETE khi

- [ ] NPC bán cá ở ngoài cổng chùa, mua được cá bằng cơ chế kinh tế hiện có.
- [ ] Thả cá đúng địa điểm, có animation, inventory cập nhật chính xác, không thả trùng.
- [ ] Bàn cầu duyên xuất hiện tại góc sân, tương tác được.
- [ ] Có cầu duyên và ít nhất 12 thẻ cầu duyên; nội dung riêng tư được bảo vệ.
- [ ] Màn tạo nhân vật phân biệt Nam/Nữ rõ ràng, không bắt người chơi cạo đầu lúc tạo account.
- [ ] Chỉ NPC mới kích hoạt hành động cạo đầu sau xác nhận.
- [ ] Nam cạo đầu hiện **Chú tiểu**, nữ cạo đầu hiện **Tiểu ni** trên đầu.
- [ ] Avatar và danh hiệu đồng bộ đúng trong multiplayer và sau reload.
- [ ] Có tủ dép trước Chánh Điện; chưa cất dép không được vào.
- [ ] Chân trần/mang dép hiển thị đúng, không mắc kẹt khi reconnect.
- [ ] Quét sân hiển thị **người cầm chổi**, không chỉ cây chổi.
- [ ] Animation quét hiển thị cho người chơi khác và không tạo avatar trùng.
- [ ] Không mất dữ liệu cũ; migration an toàn.
- [ ] Không nhân đôi vật phẩm, tiền, điểm hoặc danh hiệu do retry/hai tab.
- [ ] Automated tests PASS và browser QA có bằng chứng.
- [ ] Tài liệu dự án, checklist và handoff được cập nhật.

Nếu còn hạng mục thiếu, đánh dấu **PARTIAL**, liệt kê blocker và các bước còn lại.

---

## 15. Báo cáo bàn giao AI bắt buộc

Trả lời theo cấu trúc:

1. **Source audited:** branch, HEAD trước/sau, các module tái sử dụng.
2. **Implementation:** bảng 5 tính năng và đường dẫn file thay đổi.
3. **Schema/migrations:** thay đổi, kết quả migration trên dữ liệu cũ.
4. **Tests:** lệnh đã chạy, số PASS/FAIL, log hoặc bằng chứng.
5. **Browser QA:** từng kịch bản PASS/FAIL/NOT RUN, screenshots nếu có.
6. **Multiplayer:** xác minh hai tài khoản, đồng bộ danh hiệu và quét sân.
7. **Security:** idempotency, quyền sở hữu, validation, privacy.
8. **Known limitations:** lỗi còn lại, artwork debt, việc chưa kiểm thử.
9. **Commits/PR:** danh sách commit và trạng thái push.
10. **Final verdict:** COMPLETE hoặc PARTIAL; tuyệt đối không tự suy diễn.

## 16. Lệnh cuối cho AI Coding

**Bắt đầu ngay:** đọc repository và thực hiện tất cả 5 module theo thứ tự nội bộ trên, kiểm thử xuyên suốt và sửa lỗi đến khi đạt Definition of Done. Không chỉ đưa pseudocode, không chỉ tạo mock UI, không bỏ qua multiplayer hoặc persistence. Giữ nguyên tính năng cũ, không reset dữ liệu, không tự ý mở rộng phạm vi. Nếu thiếu công cụ kiểm thử, báo đúng giới hạn thay vì báo hoàn thành giả.
