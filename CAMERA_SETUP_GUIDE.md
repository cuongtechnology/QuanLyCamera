# 📹 Camera Setup Guide

## 🎯 Discovery vs Manual Add

### ⚠️ Discovery Limitations

ONVIF Discovery không hoạt động tốt trong Docker containers vì:
- UDP multicast bị isolated trong Docker network
- Yêu cầu `--network host` (không an toàn cho production)
- Chỉ hoạt động khi camera và server cùng LAN

**→ Khuyến nghị: Thêm camera thủ công qua API**

---

## ✅ Method 1: Add Camera via API (Recommended)

### Step 1: Tìm IP camera

**Option A: Check trên router**
```
Login router → DHCP Client List → Tìm camera
```

**Option B: Scan network**
```bash
# Install nmap
sudo apt install nmap

# Scan network (thay đổi range phù hợp)
sudo nmap -sn 192.168.1.0/24

# Tìm devices với open port 80, 554
sudo nmap -p 80,554 192.168.1.0/24
```

### Step 2: Test camera web interface

```bash
# Mở browser
http://192.168.1.100

# Login với username/password
# Thường là: admin/admin, admin/12345, admin/[serial]
```

### Step 3: Tìm RTSP URL

**Common RTSP URLs by brand:**

#### Hikvision:
```
Main Stream:
rtsp://admin:password@IP:554/Streaming/Channels/101

Sub Stream:
rtsp://admin:password@IP:554/Streaming/Channels/102
```

#### Dahua:
```
Main Stream:
rtsp://admin:password@IP:554/cam/realmonitor?channel=1&subtype=0

Sub Stream:
rtsp://admin:password@IP:554/cam/realmonitor?channel=1&subtype=1
```

#### Axis:
```
rtsp://admin:password@IP:554/axis-media/media.amp
```

#### Uniview:
```
rtsp://admin:password@IP:554/media/video1
```

#### Generic ONVIF:
```
rtsp://admin:password@IP:554/stream1
rtsp://admin:password@IP:554/stream
rtsp://admin:password@IP:554/live
```

### Step 4: Test RTSP stream

```bash
# On VPS
ffmpeg -i rtsp://admin:password@192.168.1.100:554/stream -t 5 -f null -

# Should see video info without errors:
# Stream #0:0: Video: h264, yuv420p, 1280x720, 25 fps
```

### Step 5: Add camera via API

```bash
curl -X POST http://YOUR_VPS_IP:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM001",
    "name": "Camera Main Entrance",
    "ip_address": "192.168.1.100",
    "port": 80,
    "username": "admin",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "camera": {
    "id": 1,
    "code": "CAM001",
    "name": "Camera Main Entrance",
    "status": "online",
    "rtsp_url": "rtsp://admin:password@192.168.1.100:554/..."
  }
}
```

### Step 6: Start streaming

```bash
# Start stream
curl -X POST http://YOUR_VPS_IP:3000/api/stream/start/1

# Check HLS (after 3-5 seconds)
curl http://YOUR_VPS_IP:8080/hls/CAM001/index.m3u8
```

### Step 7: View on Web UI

```
1. Open browser: http://YOUR_VPS_IP
2. Camera appears in grid
3. Click ▶️ "Start Stream"
4. Video appears in 2-3 seconds
```

---

## 🔧 Method 2: Enable Discovery (Advanced)

⚠️ **Not recommended for production** - requires `--network host`

### Step 1: Stop current deployment

```bash
cd ~/QuanLyCamera-main
docker-compose down
```

### Step 2: Modify docker-compose.yml

```yaml
services:
  backend:
    # Add network_mode
    network_mode: host
    # Remove networks section
```

### Step 3: Restart

```bash
docker-compose up -d
```

### Limitations:
- ❌ Less secure (exposes all ports)
- ❌ Port conflicts possible
- ❌ Loses Docker network isolation
- ❌ Cannot use container names for communication

---

## 📊 Multiple Cameras Setup

### Add multiple cameras at once:

```bash
# Camera 1
curl -X POST http://YOUR_VPS_IP:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM001",
    "name": "Entrance",
    "ip_address": "192.168.1.100",
    "username": "admin",
    "password": "pass1"
  }'

# Camera 2
curl -X POST http://YOUR_VPS_IP:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM002",
    "name": "Parking",
    "ip_address": "192.168.1.101",
    "username": "admin",
    "password": "pass2"
  }'

# Camera 3
curl -X POST http://YOUR_VPS_IP:3000/api/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CAM003",
    "name": "Office",
    "ip_address": "192.168.1.102",
    "username": "admin",
    "password": "pass3"
  }'
```

### Start all streams:

```bash
curl -X POST http://YOUR_VPS_IP:3000/api/stream/start-all
```

---

## 🐛 Troubleshooting

### Camera not connecting:

**Check 1: Network connectivity**
```bash
ping 192.168.1.100
```

**Check 2: Port accessibility**
```bash
telnet 192.168.1.100 80
telnet 192.168.1.100 554
```

**Check 3: Credentials**
- Try default passwords: admin/admin, admin/12345
- Reset camera if forgotten
- Check camera web interface

**Check 4: RTSP URL**
```bash
# Try different URLs
ffmpeg -i rtsp://admin:pass@IP:554/stream1 -t 5 -f null -
ffmpeg -i rtsp://admin:pass@IP:554/stream -t 5 -f null -
ffmpeg -i rtsp://admin:pass@IP:554/live -t 5 -f null -
```

### Stream not showing:

**Check 1: HLS files**
```bash
docker-compose exec nginx ls -la /var/hls/CAM001/
# Should see index.m3u8 and .ts files
```

**Check 2: Backend logs**
```bash
docker-compose logs backend | grep FFmpeg
# Should see FFmpeg process
```

**Check 3: Network bandwidth**
```bash
# Check if bandwidth is sufficient
# 1 camera 720P = ~3 Mbps
# 10 cameras = ~30 Mbps
```

### Database errors:

**Check connection:**
```bash
docker-compose exec postgres pg_isready -U vms_user
```

**View database:**
```bash
docker-compose exec postgres psql -U vms_user -d vms_onvif -c "SELECT * FROM cameras;"
```

---

## 💡 Tips

### 1. Camera naming convention:
```
Code: CAM001, CAM002, ... (for API)
Name: Entrance, Parking, Office, ... (for display)
```

### 2. Organize by location:
```
CAM_ENTRANCE_01
CAM_ENTRANCE_02
CAM_PARKING_01
CAM_OFFICE_01
```

### 3. Use sub-streams for low bandwidth:
- Main stream: 1080P @ 4 Mbps (recording)
- Sub stream: 720P @ 2 Mbps (live view)

### 4. Test one camera first:
- Add 1 camera
- Test streaming
- Then add more

---

## 📚 References

**ONVIF Spec:**
https://www.onvif.org/specs/stream/ONVIF-Streaming-Spec.pdf

**RTSP RFC:**
https://tools.ietf.org/html/rfc2326

**Camera Manuals:**
Check manufacturer website for RTSP URLs

---

**Need help? Check logs:**
```bash
./troubleshoot.sh
```
