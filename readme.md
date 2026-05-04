# Network Programming - WebRTC Project

Hướng dẫn chạy dự án (tạo cert, chạy server, TURN/coturn, test 2 người và nhóm 3–4 người).

## 1) Yêu cầu

- Node.js 18+ (hoặc 20+)
- OpenSSL
- (Tùy chọn) TURN server: coturn hoặc dịch vụ TURN

## 2) Tạo SSL cert (localhost)

Chạy lệnh ở thư mục root dự án:

```bash
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

Nếu máy không có OpenSSL, cài qua Git for Windows, WSL, hoặc cài OpenSSL riêng.

## 3) Cài dependency và chạy server

```bash
npm install
npm start
```

Mở trình duyệt: `https://localhost:3000` (bắt buộc https để dùng camera/mic).

## 4) TURN server (coturn hoặc dịch vụ TURN)

### Lựa chọn A: Chạy coturn (dev)

Ví dụ chạy nhanh trên máy local:

```bash
turnserver -a -o -v \
	--listening-port 3478 \
	--fingerprint \
	--lt-cred-mech \
	--user user:pass \
	--realm localhost \
	--no-tls --no-dtls
```

Nếu dùng Docker:

```bash
docker run -d --name coturn \
	-p 3478:3478/udp -p 3478:3478/tcp \
	instrumentisto/coturn \
	-n --log-file=stdout \
	--min-port=49160 --max-port=49200 \
	--user user:pass --realm localhost
```

Mở firewall cho UDP/TCP 3478 và relay ports nếu cần.

### Lựa chọn B: Dịch vụ TURN (prod)

Có thể dùng Twilio, Xirsys, v.v. Lấy URL/username/credential từ nhà cung cấp.

## 5) Cập nhật cấu hình ICE

Sửa `rtcConfig` trong [public/index.html](public/index.html) để thêm TURN:

```js
const rtcConfig = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		{
			urls: "turn:YOUR_TURN_HOST:3478",
			username: "user",
			credential: "pass"
		}
	]
};
```

## 6) Cách test

### Test 2 người

1. Mở 2 tab hoặc 2 trình duyệt
2. Nhập cùng `ID phòng`
3. Bấm `Call phòng`
4. Kiểm tra thấy video nhau

### Test nhóm 3–4 người

1. Mở 3–4 tab/PC
2. Tất cả vào cùng `ID phòng`
3. Bấm `Call phòng`
4. Kiểm tra luồng video hiện trên grid

Nếu test qua mạng ngoài, TURN bắt buộc hoặc sẽ gặp lỗi NAT/P2P.

## 7) Demo qua Cloudflare Tunnel

Nếu muốn demo nhanh qua internet, bạn có thể dùng Cloudflare Tunnel.

```bash
cloudflared tunnel --url https://localhost:3000
```

Sau đó mở URL được Cloudflare cung cấp (ví dụ `https://xxxxx.trycloudflare.com`).

Lưu ý:

- Tunnel có thể đóng WebSocket khi idle. Nếu đang call P2P lâu mà không có tín hiệu qua server, kết nối WS có thể bị ngắt.
- Nên bật TURN hoặc heartbeat/keepalive để tránh bị rớt phòng.