#!/bin/bash

# --- DairyBook AWS Ubuntu Auto-Setup Script ---
# This script configures Next.js DairyBook & Evolution WhatsApp API on an Ubuntu server.

set -e # Exit immediately if a command exits with a non-zero status

# Color formatting for beautiful logs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}     DairyBook & Evolution WhatsApp API        ${NC}"
echo -e "${BLUE}          Ubuntu AWS Deployment Setup           ${NC}"
echo -e "${BLUE}===============================================${NC}"

# 1. System updates & core dependencies
echo -e "\n${GREEN}[1/8] Updating system packages & installing core tools...${NC}"
sudo apt-get update
sudo apt-get install -y curl git build-essential openssl

# 2. Install Node.js v20 (LTS)
echo -e "\n${GREEN}[2/8] Installing Node.js v20 (LTS)...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo -e "Node.js is already installed: $(node -v)"
fi

# 3. Install Docker & Docker Compose (for Evolution API)
echo -e "\n${GREEN}[3/8] Installing Docker & Docker Compose...${NC}"
if ! command -v docker &> /dev/null; then
  sudo apt-get install -y docker.io docker-compose
  sudo systemctl start docker
  sudo systemctl enable docker
  # Add current user to docker group so docker commands can be run without sudo
  sudo usermod -aG docker $USER
  echo -e "${GREEN}Docker installed successfully!${NC}"
else
  echo -e "Docker is already installed."
fi

# 4. Configure Application Environment Variables (.env)
echo -e "\n${GREEN}[4/8] Configuring environment variables (.env)...${NC}"
if [ ! -f .env ]; then
  # Generate a secure 32-byte secret for NextAuth
  NEXTAUTH_SECRET=$(openssl rand -hex 32)
  
  cat <<EOT > .env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
NEXTAUTH_URL="http://localhost:3000"
EOT
  echo -e "${GREEN}Created default production .env config file.${NC}"
else
  echo -e "Existing .env config file found. Keeping current config."
fi

# 5. Install App Dependencies & Generate DB Schema
echo -e "\n${GREEN}[5/8] Installing project dependencies & setting up database...${NC}"
npm install

echo -e "Running database migrations & generating Prisma client..."
npx prisma db push
npx prisma generate

# 6. Build Next.js Production Bundle
echo -e "\n${GREEN}[6/8] Building Next.js production code bundle...${NC}"
npm run build

# 7. Start Evolution API Container Service
echo -e "\n${GREEN}[7/8] Starting Evolution WhatsApp API docker container...${NC}"
if [ -f docker-compose.yml ]; then
  # Make sure we run with sudo since docker permissions might need group refresh
  sudo docker-compose down || true
  sudo docker-compose up -d
  echo -e "${GREEN}Evolution API container is running on port 8080!${NC}"
else
  echo -e "${RED}Error: docker-compose.yml not found in the current directory!${NC}"
  exit 1
fi

# 8. Start Next.js App using PM2 Process Manager
echo -e "\n${GREEN}[8/8] Installing PM2 and starting Next.js application server...${NC}"
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
fi

# Stop existing processes if they exist to prevent port conflicts
pm2 delete dairybook &> /dev/null || true

# Start Next.js server on port 3000 in background
pm2 start npm --name "dairybook" -- run start -- -p 3000
pm2 save

# Automatically configure PM2 startup service
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME || true

# Get public IP address of the AWS EC2 instance
echo -e "\n${GREEN}Detecting Public IP address of this server...${NC}"
PUBLIC_IP=$(curl -s --max-time 3 http://169.254.169.254/latest/meta-data/public-ipv4 || true)
if [ -z "$PUBLIC_IP" ]; then
  PUBLIC_IP=$(curl -s ifconfig.me || echo "YOUR_SERVER_IP")
fi

echo -e "\n${BLUE}===============================================${NC}"
echo -e "${GREEN}🎉 DairyBook AWS Setup Completed Successfully!${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "1. DairyBook Dashboard:   http://${PUBLIC_IP}:3000"
echo -e "2. Evolution WhatsApp API: http://${PUBLIC_IP}:8080"
echo -e ""
echo -e "${BLUE}📲 Next Steps to scan WhatsApp QR Code:${NC}"
echo -e "  - Open http://${PUBLIC_IP}:3000 in your browser."
echo -e "  - Register a new account (or login using your configured pin)."
echo -e "  - Navigate to ${GREEN}Settings -> WhatsApp QR${NC} tab."
echo -e "  - Click ${GREEN}Link WhatsApp (Get QR Code)${NC}."
echo -e "  - Scan the QR code with your phone. That's it! (1-time setup)"
echo -e "${BLUE}===============================================${NC}"
