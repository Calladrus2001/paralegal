#!/bin/bash
set -euo pipefail

echo "🚀 Starting EC2 Environment Setup (Ubuntu 24.04 LTS)..."

# 1. Update System & Install Git
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget gpg unzip build-essential

# 2. Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -a -G docker ubuntu

# 3. Install Docker Compose (V2)
echo "📦 Installing Docker Compose..."
sudo apt install -y docker-compose-v2

# 4. Install Docker Buildx
echo "🏗️ Installing Docker Buildx..."
sudo apt install -y docker-buildx

# 5. Install Terraform
echo "🌍 Installing Terraform..."
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor --yes -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y terraform

# 6. Install Bun
echo "🥟 Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    # Export for the rest of this session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    # Ensure bun is in the system path for GHA
    sudo ln -sf $HOME/.bun/bin/bun /usr/bin/bun || true
else
    echo "Bun is already installed."
fi

# 7. Install Node/NPM & PM2
echo "📈 Installing PM2..."
sudo apt install -y nodejs npm
sudo npm install -g pm2
# Ensure PM2 is in the system path for GHA
sudo ln -sf $(which pm2) /usr/bin/pm2 || true

# 8. Install Caddy (Reverse Proxy for SSL)
echo "🔒 Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

echo "--------------------------------------------------"
echo "✅ Setup Complete!"
echo "⚠️  IMPORTANT: Please log out and log back in (or run 'newgrp docker') for Docker permissions to take effect."
echo "--------------------------------------------------"
