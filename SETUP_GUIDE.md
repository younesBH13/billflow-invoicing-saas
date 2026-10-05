# BillFlow Setup Guide

This guide will walk you through setting up the BillFlow invoice management system step by step.

## 🎯 Quick Start

### Option 1: Development Setup (Recommended for testing)

1. **Clone/Extract the project**
   ```bash
   # If you have the project files
   cd billflowv2
   ```

2. **Start the Backend**
   ```bash
   cd billflow-backend
   npm install
   npm run dev
   ```
   
   The backend will start on `http://localhost:3001`

3. **Start the Frontend** (in a new terminal)
   ```bash
   cd billflow-client-scribe
   npm install
   npm run dev
   ```
   
   The frontend will start on `http://localhost:5173`

4. **Access the Application**
   - Open your browser and go to `http://localhost:5173/invoices`
   - You should see the invoice management interface

### Option 2: Production Setup

Follow the detailed instructions below for a production deployment.

## 📋 Detailed Setup Instructions

### Step 1: Database Setup

1. **Install MySQL** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install mysql-server
   
   # macOS with Homebrew
   brew install mysql
   
   # Windows: Download from MySQL website
   ```

2. **Create Database**
   ```sql
   mysql -u root -p
   CREATE DATABASE billflow;
   CREATE USER 'billflow_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON billflow.* TO 'billflow_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

### Step 2: Backend Configuration

1. **Navigate to backend directory**
   ```bash
   cd billflow-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=billflow_user
   DB_PASSWORD=your_password
   DB_NAME=billflow
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # JWT Secret (generate a secure random string)
   JWT_SECRET=your_very_secure_jwt_secret_here
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   ```

4. **Build and start the server**
   ```bash
   # For development
   npm run dev
   
   # For production
   npm run build
   npm start
   ```

### Step 3: Frontend Configuration

1. **Navigate to frontend directory**
   ```bash
   cd billflow-client-scribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` file:
   ```env
   # API Configuration
   VITE_API_URL=http://localhost:3001/api
   
   # Development settings
   VITE_NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Step 4: Verification

1. **Check Backend**
   - Open `http://localhost:3001/api/invoices` in your browser
   - You should see a JSON response (might be empty initially)

2. **Check Frontend**
   - Open `http://localhost:5173` in your browser
   - Navigate to `/invoices`
   - You should see the invoice management interface

## 🔧 Configuration Options

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | localhost | Yes |
| `DB_USER` | Database username | - | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_NAME` | Database name | billflow | Yes |
| `PORT` | Server port | 3001 | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `NODE_ENV` | Environment | development | No |

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001/api | Yes |
| `VITE_NODE_ENV` | Environment | development | No |

## 🚀 Production Deployment

### Backend Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```env
   NODE_ENV=production
   DB_HOST=your_production_db_host
   DB_USER=your_production_db_user
   DB_PASSWORD=your_production_db_password
   PORT=3001
   ```

3. **Start with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "billflow-backend"
   pm2 startup
   pm2 save
   ```

### Frontend Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder**
   - Upload to your web server
   - Configure your web server to serve the files
   - Set up proper routing for SPA

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /path/to/billflow-client-scribe/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to database"**
   - Check database credentials in `.env`
   - Ensure MySQL is running
   - Verify database exists

2. **"CORS error"**
   - Check `FRONTEND_URL` in backend `.env`
   - Ensure frontend URL matches exactly

3. **"Module not found"**
   - Run `npm install` in the appropriate directory
   - Check for missing dependencies

4. **"Port already in use"**
   - Change port in `.env` file
   - Kill existing processes: `lsof -ti:3001 | xargs kill -9`

### Development Tips

1. **Use different terminals** for backend and frontend
2. **Check browser console** for frontend errors
3. **Check terminal output** for backend errors
4. **Use Postman** to test API endpoints directly

### Database Issues

1. **Reset database**
   ```sql
   DROP DATABASE billflow;
   CREATE DATABASE billflow;
   ```

2. **Check database connection**
   ```bash
   mysql -u billflow_user -p billflow
   ```

## 📱 Testing the Application

### Manual Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access `/invoices` page
- [ ] Can create a new invoice
- [ ] Can edit an existing invoice
- [ ] Can view invoice preview
- [ ] Can delete an invoice
- [ ] Form validation works
- [ ] API calls succeed

### Sample Data

You can add sample data through the interface or directly in the database:

```sql
INSERT INTO clients (name, fiscal_id, commerce_registry, tax_article, address, tva_rate) 
VALUES ('PIPELINE OIL GAZ', '001516101020596', '16/00-1010205B15', '16281813021', 'Villa N°20, Rue Parmentier, Hydra, Alger', 19);
```

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Backend
cd billflow-backend
npm update

# Frontend
cd billflow-client-scribe
npm update
```

### Backup Database

```bash
mysqldump -u billflow_user -p billflow > backup.sql
```

### Restore Database

```bash
mysql -u billflow_user -p billflow < backup.sql
```

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review error messages carefully
3. Check browser developer tools
4. Verify environment variables
5. Test API endpoints directly

---

**Happy invoicing with BillFlow!** 🚀

