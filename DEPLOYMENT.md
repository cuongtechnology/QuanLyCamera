# 🚀 Hướng dẫn Deploy lên VPS

## 📋 Yêu cầu VPS

### Cấu hình tối thiểu (10-20 cameras)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 2 TB HDD
- **OS**: Ubuntu 20.04 / 22.04 LTS
- **Network**: 100 Mbps bandwidth

### Cấu hình khuyến nghị (50 cameras 720P)
- **CPU**: 16 cores
- **RAM**: 32 GB
- **Storage**: 6 TB HDD RAID 10
- **OS**: Ubuntu 22.04 LTS
- **Network**: 200 Mbps upload / 100 Mbps download

## 🔧 Bước 1: Chuẩn bị VPS

### 1.1 Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Cài đặt Docker

```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user vào docker group
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 1.3 Cấu hình Firewall

```bash
# UFW firewall
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3702/udp    # ONVIF Discovery
sudo ufw enable

# Check status
sudo ufw status
```

### 1.4 Tạo swap (nếu RAM < 32GB)

```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 📦 Bước 2: Deploy ứng dụng

### 2.1 Clone repository

```bash
cd /opt
sudo git clone <your-repo-url> vms-onvif
cd vms-onvif
sudo chown -R $USER:$USER .
```

### 2.2 Cấu hình environment

```bash
# Copy và chỉnh sửa .env
cp backend/.env.example backend/.env
nano backend/.env
```

**Cấu hình quan trọng trong backend/.env:**

```bash
NODE_ENV=production
HOST=0.0.0.0

# Database - THAY ĐỔI PASSWORD
DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# JWT - THAY ĐỔI SECRET
JWT_SECRET=YOUR_RANDOM_SECRET_KEY_HERE

# HLS Base URL - THAY ĐỔI DOMAIN
HLS_BASE_URL=http://your-vps-ip:8080/hls
# Hoặc: HLS_BASE_URL=https://your-domain.com/hls

# Recording storage
RECORDING_PATH=/var/recordings
RECORDING_RETENTION_DAYS=7
```

### 2.3 Deploy với script

```bash
chmod +x deploy.sh
./deploy.sh
# Chọn option 1: Deploy (build and start all services)
```

### 2.4 Kiểm tra services

```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Health check
curl http://localhost:3000/api/health
curl http://localhost:80
```

## 🌐 Bước 3: Cấu hình Domain & SSL

### 3.1 Trỏ domain về VPS

Tại DNS provider của bạn:
```
A Record: your-domain.com → VPS_IP
A Record: www.your-domain.com → VPS_IP
```

### 3.2 Cài NGINX reverse proxy

```bash
sudo apt install nginx -y
```

### 3.3 Cấu hình NGINX

```bash
sudo nano /etc/nginx/sites-available/vms-onvif
```

Nội dung file:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (sẽ được tạo bởi Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # HLS Streams
    location /hls/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header Cache-Control "no-cache";
    }

    # Limit request body size (cho video upload)
    client_max_body_size 500M;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/vms-onvif /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.4 Cài SSL với Let's Encrypt

```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx -y

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## 🔐 Bước 4: Bảo mật

### 4.1 Thay đổi passwords trong docker-compose.yml

```bash
nano docker-compose.yml
```

Thay đổi:
- `POSTGRES_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`

Restart services:
```bash
docker-compose down
docker-compose up -d
```

### 4.2 Giới hạn truy cập API (optional)

Thêm vào NGINX config:

```nginx
# Chỉ cho phép truy cập từ specific IPs
location /api/cameras {
    allow 192.168.1.0/24;  # LAN
    allow your-office-ip;   # Office IP
    deny all;
    
    proxy_pass http://localhost:3000;
}
```

### 4.3 Setup fail2ban (chống brute force)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Bước 5: Monitoring & Maintenance

### 5.1 Tạo systemd service (auto-start)

```bash
sudo nano /etc/systemd/system/vms-onvif.service
```

Nội dung:

```ini
[Unit]
Description=VMS ONVIF Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/vms-onvif
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vms-onvif.service
```

### 5.2 Log rotation

```bash
sudo nano /etc/logrotate.d/vms-onvif
```

```
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
```

### 5.3 Backup script

```bash
sudo nano /opt/vms-onvif/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/vms-onvif"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U vms_user vms_onvif | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup recordings (optional, consumes much space)
# tar -czf "$BACKUP_DIR/recordings_$DATE.tar.gz" /var/recordings

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

```bash
chmod +x /opt/vms-onvif/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/vms-onvif/backup.sh >> /var/log/vms-backup.log 2>&1
```

### 5.4 Monitoring với docker stats

```bash
# Watch resource usage
watch docker stats

# Or use ctop
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop
ctop
```

## 🎯 Bước 6: Tối ưu hóa Performance

### 6.1 Docker resource limits

Chỉnh sửa `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 16G
        reservations:
          cpus: '4'
          memory: 8G
```

### 6.2 NGINX caching

Đã được cấu hình trong `docker/nginx/nginx.conf`:
- HLS cache: 10GB, 10 minutes
- Proxy cache

### 6.3 PostgreSQL tuning

```bash
docker-compose exec postgres psql -U vms_user -d vms_onvif

# Tăng connections
ALTER SYSTEM SET max_connections = 200;

# Tăng shared buffers
ALTER SYSTEM SET shared_buffers = '4GB';

# Reload config
SELECT pg_reload_conf();
```

## 🚨 Troubleshooting

### Lỗi: Port already in use

```bash
# Kiểm tra port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>
```

### Lỗi: Cannot connect to Docker daemon

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Lỗi: FFmpeg stream fails

```bash
# Check logs
docker-compose logs backend | grep FFmpeg

# Common issues:
# 1. RTSP URL sai format
# 2. Camera credentials không đúng
# 3. Network không reach được camera
```

### Lỗi: HLS stream 404

```bash
# Check HLS directory
docker-compose exec nginx ls -la /var/hls

# Check NGINX logs
docker-compose logs nginx

# Manual test FFmpeg
docker-compose exec backend ffmpeg -i rtsp://admin:password@192.168.1.100:554/stream -f hls /var/hls/test/index.m3u8
```

## 📞 Support

Nếu gặp vấn đề, check logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

---

**Chúc bạn deploy thành công! 🎉**
