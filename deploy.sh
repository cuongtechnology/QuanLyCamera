#!/bin/bash

# VMS ONVIF Deployment Script
# This script helps deploy the VMS system to production

set -e

echo "🚀 VMS ONVIF Deployment Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose is installed"

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    cp backend/.env.example backend/.env
    print_warning "Please edit backend/.env with your configuration before continuing."
    read -p "Press Enter after editing .env file..."
fi

# Menu
echo ""
echo "Select deployment option:"
echo "1) Deploy (build and start all services)"
echo "2) Start services"
echo "3) Stop services"
echo "4) Restart services"
echo "5) View logs"
echo "6) Clean up (remove containers and volumes)"
echo "7) Backup database"
echo "8) Exit"
echo ""
read -p "Enter option [1-8]: " option

case $option in
    1)
        echo ""
        echo "📦 Building and deploying services..."
        docker-compose build --no-cache
        docker-compose up -d
        print_success "Services deployed successfully!"
        echo ""
        echo "Access the application:"
        echo "  Frontend: http://localhost"
        echo "  Backend API: http://localhost:3000/api"
        echo "  HLS Streams: http://localhost:8080/hls"
        ;;
    2)
        echo ""
        echo "▶️  Starting services..."
        docker-compose up -d
        print_success "Services started!"
        ;;
    3)
        echo ""
        echo "⏹️  Stopping services..."
        docker-compose down
        print_success "Services stopped!"
        ;;
    4)
        echo ""
        echo "🔄 Restarting services..."
        docker-compose restart
        print_success "Services restarted!"
        ;;
    5)
        echo ""
        echo "📋 Viewing logs (Press Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    6)
        echo ""
        read -p "⚠️  This will remove all containers and volumes. Continue? (y/N): " confirm
        if [ "$confirm" == "y" ] || [ "$confirm" == "Y" ]; then
            docker-compose down -v
            print_success "Cleanup completed!"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;
    7)
        echo ""
        echo "💾 Backing up database..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec -T postgres pg_dump -U vms_user vms_onvif > "$BACKUP_FILE"
        print_success "Database backup saved to $BACKUP_FILE"
        ;;
    8)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "================================"
echo "✅ Done!"
