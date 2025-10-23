# ⚡ Quick Start Guide

Hướng dẫn nhanh để chạy VMS ONVIF System trong 5 phút!

## 🎯 Điều kiện

- ✅ Docker & Docker Compose đã cài đặt
- ✅ Camera ONVIF trên cùng mạng LAN với server
- ✅ Port 80, 3000, 3001, 8080 available

## 🚀 3 bước để chạy

### 1️⃣ Clone và cấu hình

```bash
git clone <your-repo-url>
cd vms-onvif
cp backend/.env.example backend/.env
```

### 2️⃣ Khởi động services

```bash
docker-compose up -d
```

Chờ 30-60 giây để các services khởi động...

### 3️⃣ Mở trình duyệt

```
http://localhost
```

🎉 Done! Bạn đã có VMS system chạy!

---

## 📝 Hướng dẫn sử dụng nhanh

### Bước 1: Phát hiện camera

1. Click nút **"Discover"** trên header
2. Chờ 5-10 giây
3. Xem console browser (F12) để thấy cameras được phát hiện

### Bước 2: Thêm camera (API)

```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM001",
    "name": "Camera Entrance",
    "ip_address": "192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "admin123"
  }'
```

**Response success:**
```json
{
  "success": true,
  "camera": {
    "id": 1,
    "code": "CAM001",
    "name": "Camera Entrance",
    "status": "online"
  }
}
```

### Bước 3: Xem camera trên web

1. Reload trang (F5)
2. Camera xuất hiện trong grid
3. Click nút ▶️ **Start Stream**
4. Video xuất hiện sau 2-3 giây

### Bước 4: Thay đổi grid layout

Click các nút trên header:
- **1x1**: 1 camera toàn màn hình
- **2x2**: 4 cameras
- **3x3**: 9 cameras
- **4x4**: 16 cameras

### Bước 5: Điều khiển PTZ (nếu camera hỗ trợ)

1. Click vào camera để select
2. PTZ control xuất hiện góc dưới bên phải
3. Click hoặc giữ các nút để điều khiển
4. Zoom in/out với các nút dưới cùng

---

## 🧪 Test với camera giả (nếu không có camera thật)

### Option 1: RTSP Test Server

```bash
docker run -d -p 8554:8554 \
  aler9/rtsp-simple-server

# Publish test stream
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=25 \
  -f lavfi -i sine=frequency=1000:sample_rate=44100 \
  -c:v libx264 -preset ultrafast \
  -c:a aac -f rtsp rtsp://localhost:8554/test
```

Thêm camera với RTSP URL: `rtsp://localhost:8554/test`

### Option 2: Video file làm RTSP stream

```bash
# Download video test
wget https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4

# Stream với FFmpeg
ffmpeg -re -stream_loop -1 -i big_buck_bunny_720p_1mb.mp4 \
  -c copy -f rtsp rtsp://localhost:8554/test
```

---

## 📊 Commands hữu ích

### Xem logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# NGINX only  
docker-compose logs -f nginx
```

### Check status

```bash
# Container status
docker-compose ps

# Health check
curl http://localhost:3000/api/health

# Active streams
curl http://localhost:3000/api/stream/status
```

### Quản lý services

```bash
# Stop all
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build

# Clean up
docker-compose down -v
```

---

## 🐛 Common Issues

### 1. Port already in use

```bash
# Check what's using port
sudo netstat -tulpn | grep :80

# Stop conflicting service
sudo systemctl stop apache2  # or nginx
```

### 2. Camera không phát hiện được

**Nguyên nhân:**
- Camera và server không cùng subnet
- Firewall block UDP port 3702
- Camera không hỗ trợ ONVIF

**Giải pháp:**
Thêm camera thủ công bằng API (xem Bước 2 ở trên)

### 3. Stream không hiển thị

**Check list:**
```bash
# 1. RTSP URL có đúng không?
ffmpeg -i rtsp://admin:pass@192.168.1.100/stream

# 2. HLS files có được tạo không?
docker-compose exec nginx ls -la /var/hls/CAM001/

# 3. Check backend logs
docker-compose logs backend | grep FFmpeg

# 4. Test HLS URL
curl http://localhost:8080/hls/CAM001/index.m3u8
```

### 4. Permission denied errors

```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Restart Docker
sudo systemctl restart docker
```

---

## 🎯 Next Steps

Sau khi chạy thành công:

1. 📖 Đọc [README.md](README.md) để hiểu full features
2. 🚀 Đọc [DEPLOYMENT.md](DEPLOYMENT.md) để deploy production
3. 🔧 Tùy chỉnh `backend/.env` cho production
4. 🔐 Đổi passwords trong `docker-compose.yml`
5. 🌐 Setup domain & SSL certificates

---

## 🆘 Cần giúp đỡ?

1. **Docs**: Đọc README.md và DEPLOYMENT.md
2. **Logs**: Check `docker-compose logs -f`
3. **Issues**: Create GitHub issue với logs kèm theo
4. **Community**: Join Discord/Slack (if available)

---

**Enjoy your VMS system! 🎥📹**
