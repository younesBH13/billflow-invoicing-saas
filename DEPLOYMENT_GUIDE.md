# BillFlow Deployment Guide

This guide provides comprehensive instructions for deploying the BillFlow application in various environments, from local desktop deployment to cloud-based hosting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Desktop Application Deployment](#desktop-application-deployment)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [Database Setup and Migration](#database-setup-and-migration)
7. [Security Considerations](#security-considerations)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- Node.js 18.0 or higher
- npm 8.0 or higher
- MySQL 8.0 or higher
- 2GB RAM
- 1GB available disk space

**Recommended Requirements:**
- Node.js 20.0 or higher
- npm 10.0 or higher
- MySQL 8.0 with InnoDB storage engine
- 4GB RAM
- 5GB available disk space
- SSD storage for better performance

### Software Dependencies

```bash
# Install Node.js (using Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install MySQL (Ubuntu/Debian)
sudo apt update
sudo apt install mysql-server

# Install MySQL (macOS with Homebrew)
brew install mysql

# Install MySQL (Windows)
# Download from https://dev.mysql.com/downloads/mysql/
```

## Local Development Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd billflow

# Install backend dependencies
cd billflow-backend
npm install

# Install frontend dependencies
cd ../billflow-client-scribe
npm install
```

### 2. Database Configuration

```bash
# Start MySQL service
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS

# Create database and user
mysql -u root -p
```

```sql
CREATE DATABASE billflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'billflow_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON billflow_db.* TO 'billflow_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Environment Configuration

**Backend Environment (.env)**
```bash
cd billflow-backend
cp .env.example .env
```

Edit the `.env` file:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=billflow_user
DB_PASSWORD=secure_password_here
DB_NAME=billflow_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
FRONTEND_URL=http://localhost:8080
```

**Frontend Environment (.env)**
```bash
cd ../billflow-client-scribe
echo "VITE_API_URL=http://localhost:3001/api" > .env
```

### 4. Initialize and Start Services

```bash
# Start backend (from billflow-backend directory)
npm run build
npm run dev

# In a new terminal, seed the database
npx ts-node src/utils/seedData.ts

# Start frontend (from billflow-client-scribe directory)
npm run dev
```

### 5. Verify Installation

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001/api/health
- Login with: admin/admin123 or commercial/commercial123

## Production Deployment

### 1. Server Preparation

**Ubuntu/Debian Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx

# Install SSL certificate tool
sudo apt install certbot python3-certbot-nginx
```

### 2. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/billflow
sudo chown $USER:$USER /var/www/billflow

# Clone and build application
cd /var/www/billflow
git clone <repository-url> .

# Build backend
cd billflow-backend
npm ci --production
npm run build

# Build frontend
cd ../billflow-client-scribe
npm ci --production
npm run build
```

### 3. Database Setup

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Create production database
mysql -u root -p
```

```sql
CREATE DATABASE billflow_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'billflow_prod'@'localhost' IDENTIFIED BY 'very_secure_production_password';
GRANT ALL PRIVILEGES ON billflow_prod.* TO 'billflow_prod'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Production Environment Configuration

**Backend Production Environment:**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=billflow_prod
DB_PASSWORD=very_secure_production_password
DB_NAME=billflow_prod

# JWT Configuration
JWT_SECRET=very-long-random-secret-key-for-production-use
JWT_EXPIRES_IN=24h

# CORS Configuration
FRONTEND_URL=https://yourdomain.com
```

### 5. Process Management with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'billflow-backend',
    script: 'dist/index.js',
    cwd: '/var/www/billflow/billflow-backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/billflow/backend-error.log',
    out_file: '/var/log/billflow/backend-out.log',
    log_file: '/var/log/billflow/backend-combined.log'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/billflow
sudo chown $USER:$USER /var/log/billflow

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Nginx Configuration

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/billflow << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend static files
    location / {
        root /var/www/billflow/billflow-client-scribe/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/billflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Desktop Application Deployment

### Option 1: Electron Wrapper

```bash
# Install Electron
cd billflow-client-scribe
npm install --save-dev electron electron-builder

# Create Electron main process
cat > electron.js << EOF
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:8080'
      : \`file://\${path.join(__dirname, '../dist/index.html')}\`
  );
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
EOF

# Update package.json
npm pkg set main="public/electron.js"
npm pkg set scripts.electron="electron ."
npm pkg set scripts.electron-dev="ELECTRON_IS_DEV=true electron ."
npm pkg set scripts.dist="electron-builder"

# Build desktop application
npm run build
npm run dist
```

### Option 2: Portable Package

```bash
# Create portable package script
cat > package-portable.sh << EOF
#!/bin/bash

# Create portable directory structure
mkdir -p billflow-portable/{backend,frontend,database}

# Copy backend
cp -r billflow-backend/dist billflow-portable/backend/
cp -r billflow-backend/node_modules billflow-portable/backend/
cp billflow-backend/package.json billflow-portable/backend/

# Copy frontend
cp -r billflow-client-scribe/dist billflow-portable/frontend/

# Create startup scripts
cat > billflow-portable/start.sh << 'SCRIPT'
#!/bin/bash
cd backend && node index.js &
BACKEND_PID=$!
cd ../frontend && python3 -m http.server 8080 &
FRONTEND_PID=$!
echo "BillFlow started. Access at http://localhost:8080"
echo "Press Ctrl+C to stop"
wait
SCRIPT

chmod +x billflow-portable/start.sh

# Create Windows batch file
cat > billflow-portable/start.bat << 'BATCH'
@echo off
cd backend
start /B node index.js
cd ..\frontend
start /B python -m http.server 8080
echo BillFlow started. Access at http://localhost:8080
pause
BATCH

echo "Portable package created in billflow-portable/"
EOF

chmod +x package-portable.sh
./package-portable.sh
```

## Cloud Deployment Options

### AWS Deployment

**Using AWS Elastic Beanstalk:**

```bash
# Install EB CLI
pip install awsebcli

# Initialize Elastic Beanstalk
eb init billflow-app

# Create environment
eb create billflow-production

# Deploy
eb deploy
```

**Using AWS EC2:**

```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Connect via SSH and follow production deployment steps
# Configure security groups for ports 80, 443, and 22
```

### Google Cloud Platform

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Initialize project
gcloud init

# Deploy to App Engine
gcloud app deploy
```

### DigitalOcean

```bash
# Create droplet with Ubuntu 22.04
# Follow production deployment steps
# Configure firewall and monitoring
```

## Database Setup and Migration

### Backup and Restore

```bash
# Create backup
mysqldump -u billflow_user -p billflow_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u billflow_user -p billflow_db < backup_20240101_120000.sql
```

### Migration Scripts

```bash
# Create migration directory
mkdir -p migrations

# Example migration script
cat > migrations/001_add_client_notes.sql << EOF
ALTER TABLE clients ADD COLUMN notes TEXT;
UPDATE clients SET notes = '' WHERE notes IS NULL;
EOF

# Run migration
mysql -u billflow_user -p billflow_db < migrations/001_add_client_notes.sql
```

## Security Considerations

### Application Security

1. **Environment Variables**: Never commit sensitive data to version control
2. **JWT Secrets**: Use strong, random secrets for JWT signing
3. **Database Passwords**: Use complex passwords and rotate regularly
4. **HTTPS**: Always use SSL/TLS in production
5. **Input Validation**: Validate all user inputs on both client and server
6. **Rate Limiting**: Implement rate limiting to prevent abuse

### Server Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban
```

## Monitoring and Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs billflow-backend

# Restart application
pm2 restart billflow-backend
```

### Database Monitoring

```bash
# MySQL performance monitoring
mysql -u root -p -e "SHOW PROCESSLIST;"
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# Automated backup script
cat > /usr/local/bin/billflow-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/billflow"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u billflow_prod -p billflow_prod > $BACKUP_DIR/billflow_$DATE.sql
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/billflow-backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /usr/local/bin/billflow-backup.sh" | sudo crontab -
```

### Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/billflow << EOF
/var/log/billflow/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check MySQL status
sudo systemctl status mysql

# Check connection
mysql -u billflow_user -p -e "SELECT 1;"

# Review MySQL logs
sudo tail -f /var/log/mysql/error.log
```

**Application Not Starting:**
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs billflow-backend --lines 50

# Check port availability
sudo netstat -tlnp | grep :3001
```

**Frontend Not Loading:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Optimization

**Database Optimization:**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Optimize MySQL configuration
-- Edit /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 64M
```

**Application Optimization:**
```bash
# Enable gzip compression in Nginx
sudo tee -a /etc/nginx/sites-available/billflow << EOF
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
EOF

sudo systemctl reload nginx
```

### Health Checks

```bash
# Create health check script
cat > /usr/local/bin/billflow-health.sh << EOF
#!/bin/bash

# Check backend API
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    pm2 restart billflow-backend
fi

# Check database
if mysql -u billflow_prod -p -e "SELECT 1;" > /dev/null 2>&1; then
    echo "Database: OK"
else
    echo "Database: FAILED"
    sudo systemctl restart mysql
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage: WARNING ($DISK_USAGE%)"
else
    echo "Disk usage: OK ($DISK_USAGE%)"
fi
EOF

chmod +x /usr/local/bin/billflow-health.sh

# Run health check every 5 minutes
echo "*/5 * * * * /usr/local/bin/billflow-health.sh >> /var/log/billflow/health.log 2>&1" | crontab -
```

This deployment guide provides comprehensive instructions for deploying BillFlow in various environments. Choose the deployment method that best fits your requirements and infrastructure capabilities.

