# Deploy Sân Mây lên Oracle Cloud (gói Always Free)

Mục tiêu: game chạy 24/7 trên một máy ảo miễn phí, có https, dữ liệu SQLite nằm trên ổ đĩa của máy ảo và được sao lưu mỗi ngày.

```
Người chơi ──https──▶ Caddy (cổng 443, tự lấy chứng chỉ) ──▶ node server.js (127.0.0.1:43127) ──▶ sanmay.db
```

Không cần dịch vụ database riêng: SQLite chỉ là một file trên máy ảo.

> Giao diện và chính sách của Oracle thay đổi theo thời gian. Nếu tên nút hoặc menu khác với hướng dẫn, hãy tìm mục tương đương.

---

## 1. Tạo tài khoản và máy ảo

1. Đăng ký tại <https://www.oracle.com/cloud/free/>. Oracle cần thẻ ngân hàng để xác minh, nhưng không trừ tiền nếu chỉ dùng tài nguyên Always Free.
2. **Chọn Home Region cẩn thận.** Sau khi chọn thì không đổi được, và máy ảo miễn phí chỉ tạo được ở vùng này. Gần Việt Nam nhất là Singapore, nhưng vùng này hay hết máy miễn phí. Japan (Tokyo/Osaka) cũng là lựa chọn ổn.
3. Vào **Compute → Instances → Create instance**:
   - **Image:** Canonical Ubuntu 24.04.
   - **Shape:** `VM.Standard.A1.Flex` (Ampere, chip ARM), chọn **1 OCPU, 6 GB RAM**. Mức này còn nằm trong hạn mức miễn phí và dư sức cho game.
     - Nếu báo *Out of capacity*: thử lại sau vài giờ, hoặc dùng `VM.Standard.E2.1.Micro` (1 GB RAM, vẫn chạy được nhưng phải bật swap, xem mục 10).
   - **Networking:** để mặc định. Kiểm tra mục *Assign a public IPv4 address* đang được chọn.
   - **SSH keys:** chọn *Generate a key pair for me* và **tải cả hai file khóa về**, cất cẩn thận. Mất file khóa riêng là mất quyền vào máy.
4. Bấm **Create**. Khi máy chạy, ghi lại **Public IP address**.

## 2. Mở cổng 80 và 443

Phải mở ở **hai nơi**: tường lửa của Oracle và tường lửa bên trong máy ảo.

**a) Tường lửa của Oracle.** Vào trang máy ảo → *Subnet* → *Security Lists* → *Default Security List* → **Add Ingress Rules**. Thêm hai rule:

| Source CIDR | IP Protocol | Destination Port |
| --- | --- | --- |
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

**b) Tường lửa trong máy ảo.** Ảnh Ubuntu của Oracle chặn sẵn mọi cổng trừ SSH. Làm bước này sau khi đã SSH vào máy ở mục 3:

```bash
sudo iptables -I INPUT 1 -p tcp -m multiport --dports 80,443 -m conntrack --ctstate NEW -j ACCEPT
sudo netfilter-persistent save
```

Không mở cổng 43127 ra ngoài: chỉ Caddy được nói chuyện với game.

## 3. SSH vào máy ảo

Trên Windows (PowerShell), đặt file khóa vào `C:\Users\<bạn>\.ssh\sanmay.key`:

```powershell
# SSH từ chối khóa nếu người khác cũng đọc được file, nên chỉ để mình bạn có quyền
icacls $HOME\.ssh\sanmay.key /inheritance:r /grant:r "$($env:USERNAME):R"
ssh -i $HOME\.ssh\sanmay.key ubuntu@<PUBLIC_IP>
```

Từ đây, mọi lệnh đều chạy **trên máy ảo**.

## 4. Cài phần mềm

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential python3 sqlite3 caddy

# Node.js 22 LTS (Node 20 đã hết hạn hỗ trợ từ 04/2026)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # phải ra v22.x
```

`build-essential` và `python3` để dự phòng: nếu `better-sqlite3` không có bản dựng sẵn cho máy, npm sẽ tự biên dịch.

## 5. Lấy code về

**Repo công khai:**

```bash
cd ~ && git clone https://github.com/leem8888/san-may.git
```

**Repo riêng tư:** dùng *deploy key* (khóa chỉ đọc, chỉ dùng cho repo này):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_sanmay -N ""
cat ~/.ssh/github_sanmay.pub
```

Chép dòng vừa hiện ra, dán vào GitHub → repo `san-may` → **Settings → Deploy keys → Add deploy key** (không tích *Allow write access*). Sau đó:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_sanmay
EOF
cd ~ && git clone git@github.com:leem8888/san-may.git
```

Cài thư viện và chạy test để chắc mọi thứ chạy được trên máy này:

```bash
cd ~/san-may
npm ci
npm test        # phải ra: pass 90, fail 0 (hoặc nhiều hơn nếu đã thêm test)
```

## 6. Tên miền miễn phí (DuckDNS)

Muốn có https thì cần một tên miền trỏ về IP của máy ảo.

1. Vào <https://www.duckdns.org>, đăng nhập bằng GitHub hoặc Google.
2. Tạo một subdomain, ví dụ `sanmay` → được `sanmay.duckdns.org`.
3. Ô *current ip*: điền **Public IP** của máy ảo → **update ip**.

Nếu đã có tên miền riêng, chỉ cần tạo bản ghi `A` trỏ về Public IP.

## 7. Cấu hình môi trường

```bash
mkdir -p ~/sanmay-data ~/backups
cat > ~/sanmay.env <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=43127
DB_FILE=/home/ubuntu/sanmay-data/sanmay.db
TRUST_PROXY=1
TZ_OFFSET_MINUTES=420
OWNER_TOKEN=$(openssl rand -hex 24)
EOF
chmod 600 ~/sanmay.env
cat ~/sanmay.env   # ghi lại OWNER_TOKEN nếu muốn xem /api/owner/journey
```

| Biến | Ý nghĩa |
| --- | --- |
| `HOST=127.0.0.1` | Game chỉ nghe trong máy; người ngoài vào qua Caddy |
| `DB_FILE` | File database, **nằm ngoài thư mục code** để `git pull` không bao giờ đụng tới |
| `TRUST_PROXY=1` | Đứng sau Caddy, server đọc đúng IP thật của người chơi (rate limit cần) |
| `TZ_OFFSET_MINUTES=420` | Nhiệm vụ ngày/tuần đổi lúc 0 giờ giờ Việt Nam |
| `OWNER_TOKEN` | Mật khẩu xem thống kê hành trình; xóa dòng này để tắt trang thống kê |

## 8. Chạy game như một dịch vụ (tự chạy lại khi lỗi hoặc khởi động máy)

```bash
sudo tee /etc/systemd/system/sanmay.service > /dev/null <<'EOF'
[Unit]
Description=San May game server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/san-may
EnvironmentFile=/home/ubuntu/sanmay.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now sanmay
systemctl status sanmay --no-pager
curl -s http://127.0.0.1:43127/healthz   # phải ra {"ok":true}
```

Xem log: `journalctl -u sanmay -f` (Ctrl+C để thoát).

## 9. https bằng Caddy

Caddy tự xin và tự gia hạn chứng chỉ Let's Encrypt. WebSocket của Socket.IO đi qua mà không cần cấu hình thêm.

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
sanmay.duckdns.org {
    encode gzip
    reverse_proxy 127.0.0.1:43127
}
EOF
sudo systemctl reload caddy
```

Thay `sanmay.duckdns.org` bằng tên miền của bạn. Mở `https://sanmay.duckdns.org` trên trình duyệt, thêm `/healthz` để kiểm tra nhanh.

Nếu không vào được, xem `journalctl -u caddy -n 50`. Lỗi hay gặp nhất là chưa mở cổng 80/443 (mục 2) hoặc tên miền chưa trỏ đúng IP.

## 10. (Chỉ máy `E2.1.Micro` 1 GB RAM) Bật swap

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 11. Sao lưu database mỗi ngày

Lệnh `.backup` của SQLite chép an toàn cả khi game đang chạy (database dùng chế độ WAL, không chép file `.db` trực tiếp được).

```bash
cat > ~/backup-sanmay.sh <<'EOF'
#!/bin/sh
sqlite3 /home/ubuntu/sanmay-data/sanmay.db ".backup '/home/ubuntu/backups/sanmay-$(date +%F).db'"
find /home/ubuntu/backups -name 'sanmay-*.db' -mtime +14 -delete
EOF
chmod +x ~/backup-sanmay.sh
(crontab -l 2>/dev/null; echo "30 3 * * * /home/ubuntu/backup-sanmay.sh") | crontab -
```

Mỗi ngày lúc 3:30 sáng (giờ máy ảo, mặc định UTC, tức 10:30 sáng giờ Việt Nam) sẽ có một bản sao lưu. Máy giữ 14 ngày gần nhất.

**Thỉnh thoảng tải bản sao lưu về máy nhà**, vì nếu mất máy ảo thì mất luôn bản sao lưu trên đó:

```powershell
scp -i $HOME\.ssh\sanmay.key "ubuntu@<PUBLIC_IP>:backups/*.db" D:\Backup\sanmay\
```

**Khôi phục từ bản sao lưu:**

```bash
sudo systemctl stop sanmay
cp ~/backups/sanmay-YYYY-MM-DD.db ~/sanmay-data/sanmay.db
rm -f ~/sanmay-data/sanmay.db-wal ~/sanmay-data/sanmay.db-shm
sudo systemctl start sanmay
```

## 12. Cập nhật code sau này

Ở nhà: sửa code → `npm test` → `git push`. Rồi SSH vào máy ảo:

```bash
cd ~/san-may && git pull && npm ci && npm test && sudo systemctl restart sanmay
```

Lệnh dừng ngay nếu test hỏng, nên game đang chạy không bị thay bằng bản lỗi. Migration database tự chạy khi server khởi động. Người đang chơi sẽ mất kết nối vài giây rồi tự vào lại.

Có thể lưu lệnh trên thành file `~/update.sh` để lần sau chỉ cần gõ `./update.sh`.

---

## Lưu ý về gói Always Free

- **Oracle có thể thu hồi máy ảo miễn phí bị coi là "nhàn rỗi"**, tức dùng rất ít CPU, mạng và RAM trong nhiều ngày liền. Game ít người chơi có thể rơi vào trường hợp này. Hai cách phòng:
  - luôn có bản sao lưu ở máy nhà (mục 11);
  - nâng tài khoản lên *Pay As You Go*: tài nguyên Always Free vẫn miễn phí và không bị thu hồi vì nhàn rỗi, nhưng **phải tự canh để không dùng vượt hạn mức** (đặt cảnh báo chi phí trong *Billing → Budgets*).
- Chỉ đăng nhập bằng khóa SSH, không bật đăng nhập bằng mật khẩu. Ubuntu đã bật sẵn tự cập nhật bảo mật.
- Kiểm tra lại các hạn mức miễn phí hiện tại trên trang của Oracle trước khi tạo thêm tài nguyên.

## Kiểm tra nhanh khi có sự cố

| Triệu chứng | Kiểm tra |
| --- | --- |
| Trang không mở được | `systemctl status sanmay caddy`, cổng 80/443 (mục 2), DuckDNS có đúng IP không |
| Trang mở nhưng không vào game được | `journalctl -u sanmay -n 100` |
| Lỗi chứng chỉ | `journalctl -u caddy -n 50`; tên miền phải trỏ đúng IP trước khi Caddy xin chứng chỉ |
| Mất dữ liệu sau khi cập nhật | `DB_FILE` trong `~/sanmay.env` phải trỏ tới `~/sanmay-data/`, không phải thư mục code |
