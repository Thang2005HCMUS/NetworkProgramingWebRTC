# Hệ Thống Video Call WebRTC (Mesh Architecture)

## 1. Yêu cầu hệ thống

1. Cài đặt **Node.js** (phiên bản 14+).
2. Tải hoặc clone thư mục của dự án và cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```

---

## 2. Cách tạo chứng chỉ SSL (Certs)
API của trình duyệt (`getUserMedia`) để gọi Camera và Micro yêu cầu trạng thái an toàn bảo mật, do đó phải sử dụng **HTTPS / WSS** (kể cả localhost). 

Cần tạo chứng chỉ tự ký như sau:
1. Tạo thư mục `certs` tại thư mục root của dự án (cùng cấp với `package.json`):
   ```bash
   mkdir certs
   ```
2. Sử dụng công cụ **OpenSSL** để sinh key và cert (bạn có thể chạy trên Git Bash, Linux hoặc MacOS):
   ```bash
   openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -days 365
   ```
*(Bạn ấn `Enter` liên tục ở các thông tin cấu hình mà OpenSSL hỏi. Mã nguồn đang đọc cố định đường dẫn `./certs/key.pem` và `./certs/cert.pem`).*

---

## 3. Chạy Server
Sau khi có chứng chỉ, bạn khởi động máy chủ (bao gồm static Front-End Express và WebSocket server).

```bash
npm install
npm start
```
Terminal sẽ hiển thị server đã được khởi động ở dòng chú ý: `HTTPS + WS chạy tại https://localhost:3000`. 
Mở trình duyệt truy cập url này để vào sử dụng. *(Nếu vào chrome báo đỏ `Your connection is not private`, ấn Advanced -> Proceed to localhost (unsafe).)*

---

## 4. Cấu hình dịch vụ TURN / Chạy Coturn
Phần Front-end (`public/index.html`) đã cấu hình STUN/TURN server ở biến `rtcConfig` hỗ trợ vượt Firewall hay lỗi địa chỉ mạng (NAT Traversal). 

**Cách chạy Coturn server để test**:
1. Cài đặt Coturn (ví dụ trên môi trường Ubuntu VPS...):
   ```bash
   sudo apt update
   sudo apt install coturn
   ```
2. Chạy dịch vụ rơ-le TURN qua terminal với lệnh sau:
   ```bash
   turnserver -a -v -n --user thang:051317 -r mydomain.com
   ```
3. Sau khi máy chủ tự chạy hoặc bạn dùng một dịch vụ proxy khác, nhớ sửa lại IP và Port trong `public/index.html` của dự án (tại khối `const rtcConfig = {...}` ) cho phù hợp với server của mình. Mặc định đang thiết lập sẵn tới IP: `54.146.22.145:3478` với thông tin tên đăng nhập `thang`.

---

## 5. Demo public qua Cloudflare Tunnel
Để cho phép thiết bị hoặc thành viên khác trên môi trường internet kết nối thử nghiệm, chúng ta sẽ hướng public host `localhost:3000` ra ngoài bằng `cloudflared`.

1. Cài đặt [cloudflared](https://github.com/cloudflare/cloudflared/releases) ở máy chạy Node.js server.
2. Mở cmd kết nối Tunnel trỏ vào HTTPS port `3000` cùng với thông số `--no-tls-verify` do chúng ta đang dùng self-signed cert.
   ```bash
   cloudflared tunnel --url https://localhost:3000 --no-tls-verify
   ```
3. Tunnel sẽ sinh thành công một đường link ở logs vd như `https://xxxxxx.trycloudflare.com`. Gửi URL đó cho các thành viên cần test hệ thống. 

---

## 6. Hướng dẫn Test luồng WebRTC

* **Test Gọi Nhóm 2 người (1v1):**
  1. Trên 2 máy / thiết bị (hoặc 2 tab trình duyệt ẩn danh) truy cập vào host.
  2. Tại trang (Login), nhập tên khác nhau nhưng cấu hình cùng chung **ID phòng** (VD: `testroom`).
  3. Ấn "**Vào phòng**" – sau đó hệ thống sẽ hỏi quyền cấp media, hãy xác nhận Cho Phép Camera/Micro.
  4. Một người chủ động (Hoặc bất cứ ai) bấm nút "**Call phòng**". Máy sẽ xử lý đẩy Offer thông qua Signaling WS đến người còn lại – bắt tay thành công lập tức lên 2 khung video cho nhau.

* **Test Gọi Đa Chiều (Nhóm 3–4 người):**
  1. Làm các bước tương tự bằng cách yêu cầu 3-4 người / thiết bị cùng gia nhập dưới 1 tên **ID phòng** duy nhất.
  2. Bất kì một người kích hoạt call bằng nút "**Call phòng**". 
  3. Với kiến trúc Multi-peer P2P, thiết bị của người bấm sẽ lần lượt sinh `RTCPeerConnection` và gửi trao đổi Offer với N-1 phần tử trực tuyến còn lại trong array member của websocket.
  4. Tại máy bạn sẽ thấy xuất hiện lần lượt từ 2, 3 và 4 box video call đồng thời trực tiếp mà không cần SFU hay MCU ở trung gian xử lý media! Mạng và phần cứng của người test sẽ được đo bằng số lượng Peer.