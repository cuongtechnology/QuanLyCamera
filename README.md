# 📹 VMS ONVIF - Video Management System

Hệ thống quản lý camera giám sát hiện đại dựa trên giao thức ONVIF, hỗ trợ streaming HLS, điều khiển PTZ, và ghi hình.

## 🌟 Tính năng

### ✅ Đã hoàn thành

- **ONVIF Discovery**: Tự động phát hiện camera ONVIF trên mạng LAN
- **Multi-Camera Streaming**: Xem nhiều camera cùng lúc (1x1, 2x2, 3x3, 4x4)
- **HLS Streaming**: Stream video qua HLS với độ trễ thấp
- **PTZ Control**: Điều khiển Pan-Tilt-Zoom cho camera hỗ trợ
- **Recording**: Ghi hình video theo lịch hoặc thủ công
- **Real-time WebSocket**: Cập nhật trạng thái camera theo thời gian thực
- **Responsive UI**: Giao diện đẹp với TailwindCSS
- **Grid Layout**: Tùy chỉnh layout hiển thị camera linh hoạt

### 🔜 Tính năng tương lai

- Motion Detection với AI (YOLOv8)
- Playback timeline với seeking
- User authentication & authorization
- Event alerts & notifications
- Cloud backup integration
- Mobile app (React Native)

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────┐
│         Frontend (React + HLS.js)       │
│    - Live View Grid                     │
│    - PTZ Controls                       │
│    - Camera Management                  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Backend (NodeJS + Express)         │
│    - ONVIF Service (node-onvif)         │
│    - Stream Service (FFmpeg → HLS)      │
│    - PTZ Control API                    │
│    - Recording Management               │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  NGINX (HLS)    │   │  PostgreSQL     │
│  - Serve HLS    │   │  - Cameras      │
│  - Caching      │   │  - Recordings   │
└─────────────────┘   └─────────────────┘
```

## 🚀 Cài đặt nhanh

### Yêu cầu

- Docker & Docker Compose
- Node.js 18+ (nếu chạy local)
- FFmpeg (đã bao gồm trong Docker)
- Camera ONVIF trên cùng mạng LAN

### 1. Clone repository

```bash
git clone <your-repo-url>
cd vms-onvif
```

### 2. Cấu hình environment

```bash
# Backend
cp backend/.env.example backend/.env
# Chỉnh sửa backend/.env với thông tin của bạn
```

### 3. Khởi động với Docker Compose

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Truy cập ứng dụng

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3000/api
- **HLS Stream**: http://localhost:8080/hls
- **PostgreSQL**: localhost:5432

## 📖 Sử dụng

### 1. Phát hiện camera

1. Click nút **"Discover"** trên header
2. Hệ thống sẽ quét mạng LAN tìm camera ONVIF
3. Danh sách camera được phát hiện sẽ hiển thị trong console

### 2. Thêm camera thủ công

```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM001",
    "name": "Camera Office",
    "ip_address": "192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "admin123"
  }'
```

### 3. Bắt đầu streaming

1. Click nút **▶️ Start Stream** trên camera card
2. Hoặc click **"Start All"** để start tất cả cameras
3. Video sẽ hiển thị sau 2-3 giây

### 4. Điều khiển PTZ

1. Click vào camera card để chọn
2. PTZ control panel xuất hiện ở góc phải dưới
3. Sử dụng các nút điều hướng và zoom

### 5. Ghi hình

```bash
# Start recording
curl -X POST http://localhost:3000/api/recordings/start/1

# Stop recording
curl -X POST http://localhost:3000/api/recordings/stop/1

# Get recordings
curl http://localhost:3000/api/recordings?cameraId=1
```

## 🔧 API Endpoints

### Cameras

- `GET /api/cameras` - Lấy danh sách camera
- `POST /api/cameras` - Thêm camera mới
- `PUT /api/cameras/:id` - Cập nhật camera
- `DELETE /api/cameras/:id` - Xóa camera
- `POST /api/cameras/:id/test` - Test kết nối camera

### Streaming

- `POST /api/stream/start/:cameraId` - Bắt đầu stream
- `POST /api/stream/stop/:cameraId` - Dừng stream
- `POST /api/stream/start-all` - Start tất cả
- `POST /api/stream/stop-all` - Stop tất cả
- `GET /api/stream/status` - Trạng thái streams

### PTZ Control

- `POST /api/ptz/move/:cameraId` - Di chuyển PTZ
- `POST /api/ptz/stop/:cameraId` - Dừng PTZ
- `GET /api/ptz/presets/:cameraId` - Lấy preset positions
- `POST /api/ptz/goto-preset/:cameraId` - Di chuyển đến preset

### Discovery

- `POST /api/discovery/scan` - Quét camera ONVIF

### Recordings

- `GET /api/recordings` - Lấy danh sách recordings
- `POST /api/recordings/start/:cameraId` - Bắt đầu ghi
- `POST /api/recordings/stop/:cameraId` - Dừng ghi
- `DELETE /api/recordings/:id` - Xóa recording

## 📊 Database Schema

### cameras

```sql
- id: SERIAL PRIMARY KEY
- code: VARCHAR(50) UNIQUE
- name: VARCHAR(255)
- ip_address: VARCHAR(45)
- port: INTEGER
- username: VARCHAR(100)
- password: VARCHAR(100)
- manufacturer: VARCHAR(100)
- model: VARCHAR(100)
- rtsp_url: TEXT
- status: VARCHAR(20) (offline, online, streaming)
- enabled: BOOLEAN
```

### streams

```sql
- id: SERIAL PRIMARY KEY
- camera_id: INTEGER REFERENCES cameras
- stream_url: TEXT
- hls_url: TEXT
- status: VARCHAR(20)
```

### recordings

```sql
- id: SERIAL PRIMARY KEY
- camera_id: INTEGER REFERENCES cameras
- file_path: TEXT
- start_time: TIMESTAMP
- end_time: TIMESTAMP
- duration: INTEGER
```

## 🎯 Cấu hình cho Production

### 1. Thay đổi passwords

```bash
# docker-compose.yml
POSTGRES_PASSWORD: your_strong_password
DB_PASSWORD: your_strong_password
JWT_SECRET: your_random_secret_key
```

### 2. Cấu hình NGINX reverse proxy

```nginx
# /etc/nginx/sites-available/vms
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:80;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
    }

    location /hls/ {
        proxy_pass http://localhost:8080;
    }
}
```

### 3. SSL/TLS với Let's Encrypt

```bash
certbot --nginx -d your-domain.com
```

### 4. Firewall rules

```bash
# Chỉ cho phép ports cần thiết
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 🔍 Troubleshooting

### Camera không phát hiện được

- Kiểm tra camera và server cùng subnet
- Kiểm tra firewall không block UDP port 3702
- Thử thêm camera thủ công với IP

### Stream không hiển thị

- Kiểm tra RTSP URL đúng: `rtsp://username:password@ip:port/path`
- Xem logs FFmpeg: `docker-compose logs backend`
- Kiểm tra HLS files: http://localhost:8080/hls/CAM001/

### PTZ không hoạt động

- Kiểm tra camera hỗ trợ PTZ
- Kiểm tra credentials đúng
- Test ONVIF connection: `POST /api/cameras/:id/test`

## 📈 Performance Tuning

### Cho 50 cameras 720P

**Server đề xuất:**
- CPU: 16 cores
- RAM: 32 GB
- Storage: 6 TB HDD RAID 10
- Network: 200 Mbps upload, 100 Mbps download

**FFmpeg optimization:**

```javascript
// streamService.js
outputOptions: [
  '-c:v', 'libx264',
  '-preset', 'ultrafast',  // Giảm CPU usage
  '-tune', 'zerolatency',  // Giảm latency
  '-b:v', '1M',            // Bitrate thấp hơn
]
```

**NGINX caching:**

```nginx
proxy_cache_path /var/cache/nginx/hls 
                 levels=1:2 
                 keys_zone=hls_cache:100m 
                 max_size=10g;
```

## 🛠️ Development

### Chạy local (không dùng Docker)

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend
cd frontend
npm install
npm start

# PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_DB=vms_onvif \
  -e POSTGRES_USER=vms_user \
  -e POSTGRES_PASSWORD=password \
  postgres:15-alpine
```

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 🤝 Contributing

Pull requests are welcome! Đối với thay đổi lớn, vui lòng mở issue trước.

## 📧 Contact

- GitHub Issues: [Issues](https://github.com/your-repo/issues)
- Email: your-email@example.com

---

**Made with ❤️ for VMS ONVIF Community**
