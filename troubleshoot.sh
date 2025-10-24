#!/bin/bash

# Troubleshooting Script
echo "🔍 VMS ONVIF Troubleshooting"
echo "================================"

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "🏥 Health Status:"
docker ps --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "📝 Recent Backend Logs (last 50 lines):"
docker-compose logs --tail=50 backend

echo ""
echo "💾 Database Connection Test:"
docker-compose exec -T postgres pg_isready -U vms_user
if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

echo ""
echo "🌐 Network Test:"
echo "Testing backend health endpoint..."
docker-compose exec -T backend wget -q -O- http://localhost:3000/api/health
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding"
fi

echo ""
echo "📦 Disk Usage:"
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "💾 Memory Usage:"
free -h

echo ""
echo "🐳 Docker System Info:"
docker system df

echo ""
echo "================================"
echo "💡 Common Solutions:"
echo ""
echo "1. Restart services:"
echo "   docker-compose restart"
echo ""
echo "2. View live logs:"
echo "   docker-compose logs -f backend"
echo ""
echo "3. Rebuild everything:"
echo "   docker-compose down -v"
echo "   docker-compose up -d --build"
echo ""
echo "4. Check if ports are in use:"
echo "   sudo netstat -tulpn | grep -E '(80|3000|3001|8080|5432)'"
