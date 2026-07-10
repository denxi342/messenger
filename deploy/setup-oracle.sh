#!/bin/bash
set -e

echo "Starting Oracle Cloud Messenger Deployment..."

# 1. Update and install dependencies
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

# 2. Install Node.js (v20 LTS) if not installed
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 4. Set up environment variables
if [ ! -f .env ]; then
    cp .env.production .env
    echo ".env created from .env.production"
fi

# 5. Install backend and frontend dependencies
echo "Installing backend dependencies..."
cd server
npm install
cd ..

echo "Installing frontend dependencies..."
npm install

# 6. Build the React frontend
echo "Building React frontend..."
npm run build

# 7. Move to Nginx directory
echo "Deploying frontend to /var/www/messenger..."
sudo mkdir -p /var/www/messenger
sudo cp -r dist /var/www/messenger/
sudo chown -R www-data:www-data /var/www/messenger

# 8. Configure Nginx
echo "Configuring Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/messenger
sudo ln -sf /etc/nginx/sites-available/messenger /etc/nginx/sites-enabled/
# Remove default nginx config to prevent conflicts
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# 9. Start PM2 backend
echo "Starting backend via PM2..."
pm2 start ecosystem.config.cjs
pm2 save

# Setup PM2 to start on boot
echo "Configuring PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $USER --hp $HOME || true
pm2 save

echo ""
echo "================================================="
echo "✅ Deployment Successful!"
echo "The messenger application is now running on your server's public IP address."
echo ""
echo "To enable HTTPS later, point your domain name to this server's IP address,"
echo "and then run the following command:"
echo "sudo certbot --nginx -d yourdomain.com"
echo "================================================="
