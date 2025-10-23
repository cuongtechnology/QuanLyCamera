# ✅ VMS ONVIF Installation Checklist

Use this checklist when deploying to VPS.

## 📋 Pre-Installation

### VPS Requirements
- [ ] VPS với Ubuntu 20.04/22.04 LTS
- [ ] Minimum 16 CPU cores, 32 GB RAM
- [ ] 6 TB storage available
- [ ] 200 Mbps network bandwidth
- [ ] Root or sudo access

### Network Requirements
- [ ] Static IP address assigned
- [ ] Ports available: 22, 80, 443, 3000, 3001, 8080, 5432
- [ ] Camera và VPS trong cùng LAN (hoặc VPN)
- [ ] Firewall rules configured

### Domain (Optional but recommended)
- [ ] Domain name registered
- [ ] DNS A record pointing to VPS IP
- [ ] SSL certificate ready (or use Let's Encrypt)

---

## 🔧 Installation Steps

### Step 1: System Preparation
- [ ] SSH into VPS: `ssh root@your-vps-ip`
- [ ] Update system: `apt update && apt upgrade -y`
- [ ] Set timezone: `timedatectl set-timezone Asia/Ho_Chi_Minh`
- [ ] Create non-root user (optional): `adduser vmsuser`
- [ ] Add user to sudo: `usermod -aG sudo vmsuser`

### Step 2: Install Docker
- [ ] Run: `curl -fsSL https://get.docker.com -o get-docker.sh`
- [ ] Run: `sh get-docker.sh`
- [ ] Add user to docker group: `usermod -aG docker $USER`
- [ ] Install Docker Compose:
  ```bash
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  ```
- [ ] Verify: `docker --version && docker-compose --version`
- [ ] Logout and login again

### Step 3: Firewall Setup
- [ ] Install UFW: `apt install ufw -y`
- [ ] Configure rules:
  ```bash
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 3702/udp
  ```
- [ ] Enable: `ufw enable`
- [ ] Check: `ufw status`

### Step 4: Clone Project
- [ ] Navigate: `cd /opt`
- [ ] Clone: `git clone <your-repo-url> vms-onvif`
- [ ] Enter directory: `cd vms-onvif`
- [ ] Check files: `ls -la`

### Step 5: Environment Configuration
- [ ] Copy env file: `cp backend/.env.example backend/.env`
- [ ] Edit: `nano backend/.env`
- [ ] Change these values:
  - [ ] `DB_PASSWORD` → Strong password
  - [ ] `JWT_SECRET` → Random secret key
  - [ ] `HLS_BASE_URL` → Your domain or IP
  - [ ] `RECORDING_RETENTION_DAYS` → Your retention policy
- [ ] Save and exit (Ctrl+X, Y, Enter)

### Step 6: Docker Compose Configuration
- [ ] Edit: `nano docker-compose.yml`
- [ ] Change these values:
  - [ ] `POSTGRES_PASSWORD` → Same as DB_PASSWORD
  - [ ] `JWT_SECRET` → Same as backend .env
- [ ] Save and exit

### Step 7: Deploy Application
- [ ] Make script executable: `chmod +x deploy.sh`
- [ ] Run deployment: `./deploy.sh`
- [ ] Select option 1 (Deploy)
- [ ] Wait for build (5-10 minutes)
- [ ] Check containers: `docker-compose ps`
- [ ] All should show "Up"

### Step 8: Health Check
- [ ] Test backend: `curl http://localhost:3000/api/health`
- [ ] Should return: `{"status":"healthy",...}`
- [ ] Test frontend: `curl http://localhost:80`
- [ ] Should return HTML
- [ ] Check logs: `docker-compose logs -f`
- [ ] No critical errors

---

## 🌐 Domain & SSL Setup (Production)

### Step 9: Install NGINX Reverse Proxy
- [ ] Install: `apt install nginx -y`
- [ ] Create config: `nano /etc/nginx/sites-available/vms-onvif`
- [ ] Copy config from DEPLOYMENT.md
- [ ] Update domain name in config
- [ ] Enable site: `ln -s /etc/nginx/sites-available/vms-onvif /etc/nginx/sites-enabled/`
- [ ] Test config: `nginx -t`
- [ ] Reload: `systemctl reload nginx`

### Step 10: SSL Certificate (Let's Encrypt)
- [ ] Install Certbot: `apt install certbot python3-certbot-nginx -y`
- [ ] Get certificate: `certbot --nginx -d your-domain.com -d www.your-domain.com`
- [ ] Follow prompts
- [ ] Test renewal: `certbot renew --dry-run`
- [ ] Should succeed

---

## 🧪 Testing

### Step 11: Add Test Camera
- [ ] Find camera IP: Check your network
- [ ] Test camera RTSP:
  ```bash
  docker-compose exec backend ffmpeg -i rtsp://admin:password@camera-ip/stream -t 5 -f null -
  ```
- [ ] Add via API:
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
- [ ] Should return camera JSON with ID

### Step 12: Start Streaming
- [ ] Via API:
  ```bash
  curl -X POST http://localhost:3000/api/stream/start/1
  ```
- [ ] Check HLS: `curl http://localhost:8080/hls/CAM001/index.m3u8`
- [ ] Should return m3u8 playlist
- [ ] Or use browser: Open `http://your-domain.com`
- [ ] Click "Start Stream" button
- [ ] Video should appear in 2-3 seconds

### Step 13: Test PTZ (if camera supports)
- [ ] Select camera in web UI
- [ ] PTZ controls appear
- [ ] Click direction buttons
- [ ] Camera should move

---

## 🔐 Security Hardening

### Step 14: Change Default Ports (Optional)
- [ ] Edit docker-compose.yml
- [ ] Change external ports:
  - `3000:3000` → `8001:3000`
  - `3001:3001` → `8002:3001`
- [ ] Restart: `docker-compose up -d`
- [ ] Update NGINX config accordingly

### Step 15: Fail2Ban (Recommended)
- [ ] Install: `apt install fail2ban -y`
- [ ] Enable: `systemctl enable fail2ban`
- [ ] Start: `systemctl start fail2ban`

### Step 16: Regular Backups
- [ ] Create backup directory: `mkdir -p /backup/vms-onvif`
- [ ] Copy backup script from DEPLOYMENT.md
- [ ] Make executable: `chmod +x backup.sh`
- [ ] Test run: `./backup.sh`
- [ ] Add to crontab: `crontab -e`
- [ ] Add line: `0 2 * * * /opt/vms-onvif/backup.sh`

---

## 🚀 Post-Installation

### Step 17: Auto-start on Boot
- [ ] Create systemd service
- [ ] Copy service file from DEPLOYMENT.md
- [ ] Save to: `/etc/systemd/system/vms-onvif.service`
- [ ] Reload: `systemctl daemon-reload`
- [ ] Enable: `systemctl enable vms-onvif.service`
- [ ] Test reboot: `reboot`
- [ ] After reboot, check: `docker-compose ps`

### Step 18: Monitoring Setup
- [ ] Install ctop:
  ```bash
  wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
  chmod +x /usr/local/bin/ctop
  ```
- [ ] Run: `ctop`
- [ ] Monitor resource usage

### Step 19: Documentation
- [ ] Document your camera list (names, IPs, locations)
- [ ] Save admin passwords securely (use password manager)
- [ ] Document any custom configurations
- [ ] Create runbook for common operations

---

## ✅ Final Verification

### Checklist Before Going Live
- [ ] All containers are running (`docker-compose ps`)
- [ ] No errors in logs (`docker-compose logs`)
- [ ] Website accessible via domain
- [ ] HTTPS working (green padlock in browser)
- [ ] At least 1 camera streaming successfully
- [ ] PTZ control working (if applicable)
- [ ] Recording working (check database)
- [ ] Backup script tested
- [ ] Auto-start on boot tested
- [ ] Firewall configured correctly
- [ ] Passwords changed from defaults
- [ ] Documentation completed

### Performance Check
- [ ] CPU usage < 80%: `htop`
- [ ] RAM usage < 80%: `free -h`
- [ ] Disk usage < 80%: `df -h`
- [ ] Network not saturated: `iftop`
- [ ] HLS latency < 10 seconds

---

## 🆘 Troubleshooting

If something goes wrong, check:

1. **Logs**:
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f nginx
   docker-compose logs -f postgres
   ```

2. **Container status**:
   ```bash
   docker-compose ps
   docker-compose restart <service>
   ```

3. **Disk space**:
   ```bash
   df -h
   docker system prune -a  # Clean up
   ```

4. **Network**:
   ```bash
   netstat -tulpn | grep LISTEN
   curl http://localhost:3000/api/health
   ```

5. **Camera connectivity**:
   ```bash
   ping <camera-ip>
   curl http://<camera-ip>
   ```

---

## 📞 Get Help

- 📖 Read: [README.md](README.md)
- 🚀 Deploy: [DEPLOYMENT.md](DEPLOYMENT.md)
- ⚡ Quick: [QUICK_START.md](QUICK_START.md)
- 📊 Summary: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- 🐛 Issues: GitHub Issues
- 💬 Community: Discord/Slack

---

**Good luck with your installation! 🎉**

Date: _______________
Completed by: _______________
