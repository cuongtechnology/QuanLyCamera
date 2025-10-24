#!/bin/bash

# Quick Fix Script for Docker Build Issues
echo "🔧 VMS ONVIF Quick Fix Script"
echo "================================"

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Clean up old Docker images
echo "🧹 Cleaning up old Docker images..."
docker-compose down --rmi local

# Rebuild and start
echo "🔨 Rebuilding and starting services..."
docker-compose up -d --build

echo ""
echo "✅ Done! Checking service status..."
docker-compose ps

echo ""
echo "📝 Next steps:"
echo "  1. Check logs: docker-compose logs -f"
echo "  2. Open browser: http://localhost"
echo "  3. Test API: curl http://localhost:3000/api/health"
