# Linux Server Deployment Guide

## Prerequisites

1. **Node.js and npm** (v16 or higher)
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **PostgreSQL** (if not already installed)
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

3. **PM2** (for process management)
   ```bash
   npm install -g pm2
   ```

## Environment Setup

1. **Copy the application to your server**
   ```bash
   scp -r ./captive-portal-app user@your-server:/opt/
   ```

2. **Navigate to the application directory**
   ```bash
   cd /opt/captive-portal-app
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Update the following variables:
   ```
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=your-radius-database
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   RADIUS_HOST=your-radius-server
   RADIUS_PORT=1812
   RADIUS_SECRET=your-radius-secret
   JWT_SECRET=your-jwt-secret
   PORT=3000
   NODE_ENV=production
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=secure-admin-password
   ```

## Installation and Startup

### Option 1: Using the startup script
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual installation
```bash
# Install dependencies
npm run install-all

# Build for production
npm run build

# Start with PM2
pm2 start server/index.js --name "captive-portal"
pm2 save
pm2 startup
```

## Nginx Configuration (Optional)

Create `/etc/nginx/sites-available/captive-portal`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/captive-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Optional)

Using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Firewall Configuration

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # App port (if not using nginx)
sudo ufw enable
```

## Monitoring and Logs

```bash
# View PM2 logs
pm2 logs captive-portal

# View application logs
tail -f /opt/captive-portal-app/logs/app.log

# Monitor processes
pm2 monit
```

## Troubleshooting

1. **Database connection issues**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check connection: `psql -h your-host -U your-user -d your-database`

2. **RADIUS connection issues**
   - Test RADIUS server connectivity
   - Verify RADIUS secret and port configuration

3. **Port conflicts**
   - Check if port 3000 is available: `netstat -tulpn | grep :3000`
   - Change port in .env if needed

4. **Permission issues**
   - Ensure proper file permissions: `chmod -R 755 /opt/captive-portal-app`
   - Check user permissions for database access

## Backup and Maintenance

```bash
# Database backup
pg_dump -h your-host -U your-user your-database > backup.sql

# Application backup
tar -czf captive-portal-backup.tar.gz /opt/captive-portal-app

# Update application
git pull origin main
npm run install-all
npm run build
pm2 restart captive-portal
```
