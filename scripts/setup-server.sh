#!/bin/bash
set -euo pipefail

echo "🚀 Starting Server Environment Setup (Ubuntu 24.04 LTS)..."

CURRENT_USER=$(whoami)
USER_HOME=$HOME

# 1. Update System & Install Git
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget gpg unzip build-essential

# 2. Install Docker
echo "🐳 Installing Docker..."
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
if id -u ubuntu &>/dev/null; then
    sudo usermod -a -G docker ubuntu || true
fi

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
    export BUN_INSTALL="$USER_HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    # Ensure bun is in the system path for GHA
    sudo ln -sf $USER_HOME/.bun/bin/bun /usr/bin/bun || true
else
    echo "Bun is already installed."
fi

# 7. Install Node.js (v22 LTS) & PM2
echo "📈 Installing Node.js 22 & PM2..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
# Ensure PM2 is in the system path for GHA
sudo ln -sf $(which pm2) /usr/bin/pm2 || true
# Configure PM2 to auto-start on system boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$CURRENT_USER" --hp "$USER_HOME" || true

# 8. Install Caddy (Reverse Proxy for SSL)
echo "🔒 Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# 9. Configure Caddy Reverse Proxy
echo "🔧 Configuring Caddy Reverse Proxy..."
DOMAIN="api.paralegal.vishesh-dugar.me"
AWS_DOMAIN="aws.paralegal.vishesh-dugar.me"
UI_DOMAIN="paralegal.vishesh-dugar.me"
cat <<EOF | sudo tee /etc/caddy/Caddyfile
$DOMAIN {
    reverse_proxy localhost:3000
}

$AWS_DOMAIN {
    reverse_proxy localhost:4566
}

$UI_DOMAIN {
    handle /api/* {
        reverse_proxy localhost:3000
    }

    handle {
        root * $USER_HOME/paralegal/dist/client
        file_server
        try_files {path} /index.html
    }
}
EOF

echo "🔄 Restarting Caddy"
sudo chmod 755 "$USER_HOME"
sudo systemctl restart caddy

echo "--------------------------------------------------"
echo "✅ Setup Complete!"
echo "--------------------------------------------------"
