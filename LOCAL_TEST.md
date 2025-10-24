# 🧪 Local Testing Guide

## ⚡ Quick Test (5 minutes)

### Prerequisites
- Docker Desktop installed
- Git installed
- 8 GB RAM available

### Steps

1. **Clone repository:**
```bash
git clone https://github.com/cuongtechnology/QuanLyCamera.git
cd QuanLyCamera
```

2. **Setup environment:**
```bash
cp backend/.env.example backend/.env
```

No need to edit - defaults work for local testing!

3. **Start services:**
```bash
docker-compose up -d
```

Wait 2-3 minutes for services to build and start...

4. **Check status:**
```bash
docker-compose ps
```

All services should show "Up" status.

5. **Open browser:**
```
http://localhost
```

You should see the VMS web interface! 🎉

---

## 📹 Add a Test Camera

### Option 1: Using API (Recommended)

```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM001",
    "name": "Test Camera",
    "ip_address": "192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "admin123"
  }'
```

Replace IP, username, password with your camera credentials.

### Option 2: Using Postman/Insomnia

**POST** `http://localhost:3000/api/cameras`

**Body (JSON):**
```json
{
  "code": "CAM001",
  "name": "Office Camera",
  "ip_address": "192.168.1.100",
  "port": 80,
  "username": "admin",
  "password": "admin123"
}
```

### Option 3: Test with Fake RTSP Stream

If you don't have real cameras:

```bash
# Start RTSP test server
docker run -d --name rtsp-server -p 8554:8554 aler9/rtsp-simple-server

# Generate test video stream
docker run --rm -it --network host \
  linuxserver/ffmpeg \
  -re -f lavfi -i testsrc=size=1280x720:rate=25 \
  -f lavfi -i sine=frequency=1000 \
  -c:v libx264 -preset ultrafast \
  -c:a aac -f rtsp rtsp://localhost:8554/test
```

Then add camera with:
```bash
curl -X POST http://localhost:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST001",
    "name": "Test Stream",
    "ip_address": "localhost",
    "port": 8554,
    "username": "",
    "password": "",
    "rtsp_url": "rtsp://localhost:8554/test"
  }'
```

---

## 🎥 Start Streaming

### Via Web UI:
1. Reload page (F5)
2. Camera appears in grid
3. Click ▶️ "Start Stream" button
4. Video appears in 2-3 seconds

### Via API:
```bash
# Get camera ID first
curl http://localhost:3000/api/cameras

# Start stream (replace 1 with your camera ID)
curl -X POST http://localhost:3000/api/stream/start/1
```

---

## 🔍 Verify Everything Works

### Check Backend Health:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-24T...",
  "uptime": 123.45,
  "environment": "development"
}
```

### Check Frontend:
```bash
curl http://localhost
```

Should return HTML.

### Check HLS Stream:
```bash
curl http://localhost:8080/hls/CAM001/index.m3u8
```

Should return m3u8 playlist.

### Check Logs:
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# NGINX only
docker-compose logs -f nginx
```

---

## 🛠️ Common Issues

### Port Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop conflicting service
sudo systemctl stop apache2  # or nginx
```

### Docker Not Running

```bash
# Start Docker Desktop
# Or on Linux:
sudo systemctl start docker
```

### Containers Keep Restarting

```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Common issue: Not enough RAM
# Solution: Close other apps or increase Docker RAM limit
```

### Camera Not Connecting

**Checklist:**
- [ ] Camera and computer on same network
- [ ] Camera IP is correct
- [ ] Username/password is correct
- [ ] RTSP port is accessible (usually 554)

**Test camera RTSP manually:**
```bash
# Install ffmpeg first
# Then test:
ffmpeg -i rtsp://admin:password@192.168.1.100/stream -t 5 -f null -

# Should show video info without errors
```

### Stream Not Showing

**Check:**
1. HLS files exist:
```bash
docker-compose exec nginx ls -la /var/hls/CAM001/
```

2. FFmpeg process running:
```bash
docker-compose exec backend ps aux | grep ffmpeg
```

3. Browser console for errors (F12)

---

## 🧹 Cleanup

### Stop services:
```bash
docker-compose down
```

### Remove all data (including database):
```bash
docker-compose down -v
```

### Remove Docker images:
```bash
docker-compose down --rmi all -v
```

---

## 📊 Resource Usage

Typical resource usage for 1-4 cameras:

```
CPU:    10-30%
RAM:    2-4 GB
Disk:   500 MB (+ recordings)
Network: 3-12 Mbps upload
```

---

## 🎯 Next Steps

After successful local testing:

1. ✅ Add more cameras
2. ✅ Test PTZ controls
3. ✅ Test recording
4. ✅ Try different grid layouts (1x1, 2x2, 3x3, 4x4)
5. 📖 Read [DEPLOYMENT.md](DEPLOYMENT.md) for VPS deployment
6. 🌐 Setup domain & SSL for production

---

## 💡 Tips

- **Use Chrome/Edge**: Best HLS.js support
- **Low latency**: HLS has ~4-6 seconds delay (normal)
- **Multiple viewers**: Each viewer adds bandwidth usage
- **Recording space**: 1 camera 720P = ~1GB/hour

---

## 🆘 Get Help

1. Check logs: `docker-compose logs -f`
2. Read docs: `README.md`, `DEPLOYMENT.md`
3. GitHub Issues: https://github.com/cuongtechnology/QuanLyCamera/issues

---

**Happy testing! 🎥**
