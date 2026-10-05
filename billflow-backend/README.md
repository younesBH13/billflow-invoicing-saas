# BillFlow Backend API

Express.js backend API for the BillFlow facturation and client management system.

## Features

- RESTful API endpoints for all business operations
- JWT-based authentication and authorization
- MySQL database integration with automatic schema creation
- Comprehensive data validation and error handling
- CORS support for frontend integration
- Rate limiting and security middleware
- Automatic database seeding with sample data

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get specific client
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/:id/statistics` - Get client statistics

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get specific invoice
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/convert` - Convert invoice type
- `GET /api/invoices/next-number/:type` - Get next invoice number

### Payments
- `GET /api/payments` - List all payments
- `GET /api/payments/invoice/:invoiceId` - Get payments for invoice
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Delivery Notes
- `GET /api/delivery-notes` - List all delivery notes
- `GET /api/delivery-notes/:id` - Get specific delivery note
- `POST /api/delivery-notes` - Create new delivery note
- `PUT /api/delivery-notes/:id` - Update delivery note
- `DELETE /api/delivery-notes/:id` - Delete delivery note

### Document Templates
- `GET /api/templates` - List all templates
- `GET /api/templates/:id` - Get specific template
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `PUT /api/templates/:id/set-default` - Set default template

### Reports
- `GET /api/reports/advanced` - Get advanced reporting data
- `GET /api/reports/revenue` - Get revenue statistics
- `GET /api/reports/clients` - Get client performance data

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=billflow_user
DB_PASSWORD=billflow_password
DB_NAME=billflow_db
DB_USER_HOST=localhost

# Optional admin credentials used to auto-provision the database/user
# Leave blank to skip automatic provisioning
DB_ADMIN_HOST=localhost
DB_ADMIN_PORT=3306
DB_ADMIN_USER=
DB_ADMIN_PASSWORD=

# Allow BillFlow to fall back to root credentials when admin details are not set.
# Useful for local stacks like XAMPP that ship with a root user and blank password.
DB_ALLOW_ROOT_FALLBACK=false
DB_ROOT_PASSWORD=

# JWT Configuration
# Must be at least 32 characters for security
JWT_SECRET=your-super-secret-jwt-key-with-min-32-chars
JWT_EXPIRES_IN=24h

# CORS Configuration (comma-separated list, use * to allow all for local testing only)
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Schema

The application automatically creates the following tables:

- `users` - User accounts and authentication
- `clients` - Client information and contact details
- `invoices` - Invoice records with status tracking
- `invoice_lines` - Individual line items for invoices
- `payments` - Payment records linked to invoices
- `delivery_notes` - Delivery note records
- `document_templates` - Customizable document templates

## Installation and Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create the database and sample data**
   - **Recommended: run the automated bootstrapper**
     ```bash
     npm run setup:db
     ```
     The script provisions the `billflow_db` database (using the admin credentials or root fallback described below), verifies the application credentials can connect, and populates realistic demo users, clients, invoices, and payments so you can explore the app immediately.

   - **Alternatively: rely on automatic provisioning during server startup**
    1. Fill in `DB_ADMIN_USER` and `DB_ADMIN_PASSWORD` (and adjust host/port if needed) in your `.env`.
       If you are running a local stack such as XAMPP that exposes a `root` user, you can set `DB_ALLOW_ROOT_FALLBACK=true` and, if necessary, `DB_ROOT_PASSWORD`. The server only uses the fallback when the configured application user is rejected and no admin credentials are supplied.
    2. Start the backend—on first run it will create the database, user, and grant privileges automatically.
       If the user already exists, the server will align its password with the values from your `.env`.

   - **Manual option**
     ```bash
     mysql -u root -p
     CREATE DATABASE billflow_db;
     CREATE USER 'billflow_user'@'localhost' IDENTIFIED BY 'billflow_passwordd';
     GRANT ALL PRIVILEGES ON billflow_db.* TO 'billflow_user'@'localhost';
     FLUSH PRIVILEGES;
     ```

4. **Build and run**
   ```bash
   npm run build
   npm run dev
   ```

## Troubleshooting

### Reinstall/XAMPP reset: database is empty and the backend will not start

When XAMPP is reinstalled the MySQL data directory is wiped, so the BillFlow
database, user, and tables disappear. The quickest way to recreate everything
and load demo data is:

1. **Ensure MySQL is running in XAMPP.**
2. **Copy and edit the environment file**
   ```bash
   cd billflow-backend
   cp .env.example .env
   ```
   - Set `DB_ALLOW_ROOT_FALLBACK=true` so the bootstrapper can log in with the
     XAMPP `root` account (default blank password). If you set a password for
     `root`, place it in `DB_ROOT_PASSWORD`.
   - If you prefer an application user, also set `DB_USER`, `DB_PASSWORD`, and
     `DB_NAME`; the bootstrapper will create them for you.
3. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```
4. **Create and seed the database automatically**
   ```bash
   npm run setup:db
   ```
   This creates the database/user (using the admin or root fallback), builds
   all tables (including avance/timbre fields), and inserts sample users,
   clients, invoices, payments, and templates so the UI works immediately.
5. **Start the backend**
   ```bash
   npm run dev
   ```

If you prefer to recreate the database manually in phpMyAdmin or the MySQL
console, run the following SQL before starting the server (adjust credentials
and database name as needed):

```sql
CREATE DATABASE IF NOT EXISTS billflow_db;
CREATE USER IF NOT EXISTS 'billflow_user'@'localhost' IDENTIFIED BY 'billflow_passwordd';
GRANT ALL PRIVILEGES ON billflow_db.* TO 'billflow_user'@'localhost';
FLUSH PRIVILEGES;
```

After running the SQL above, set `DB_USER=billflow_user`,
`DB_PASSWORD=billflow_password`, and `DB_NAME=billflow_db` in `.env`, then run
`npm run setup:db` to load the demo data.

### Access denied for user 'billflow_user'@'localhost'

If the server logs `ER_ACCESS_DENIED_ERROR` during startup, MySQL rejected the
credentials defined in your `.env`. Double-check the username and password, and
ensure the MySQL account has rights on the configured database:

```sql
CREATE USER 'billflow_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON `billflow_db`.* TO 'billflow_user'@'localhost';
FLUSH PRIVILEGES;
```

Restart the backend after applying the changes.

### Manually seeding login users

If your database was recreated and no users are present, the backend will now
automatically insert the default credentials (admin/admin123 and
commercial/commercial123) the first time it starts. On every startup the
bootstrapper also refreshes these two accounts so their passwords stay in sync
with the documented defaults. You can also re-run the seed manually with the
bundled `USER_SEED.sql` script:

```bash
mysql -u root -p billflow_db < USER_SEED.sql
```

Replace `root` and `billflow_db` with the correct MySQL user/database for your
setup. The script uses bcrypt hashes so it works whether the server verifies
passwords with bcrypt or argon2.

## Development

### Available Scripts

- `npm run setup:db` - Provision the database and load demo data
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)

### Project Structure

```
src/
├── controllers/     # Request handlers for each entity
├── middleware/      # Express middleware (auth, validation, etc.)
├── models/         # Data models and interfaces
├── routes/         # Route definitions
├── config/         # Configuration files (database, etc.)
├── utils/          # Utility functions and helpers
├── types/          # TypeScript type definitions
└── index.ts        # Main application entry point
```

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS configuration for frontend integration
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- Security headers with Helmet.js

## Error Handling

The API provides consistent error responses with appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error responses include descriptive messages to help with debugging and user feedback.

## Performance Considerations

- Database connection pooling for efficient resource usage
- Indexed database columns for fast queries
- Pagination support for large datasets
- Compression middleware for reduced response sizes
- Efficient SQL queries with proper joins

## Deployment

### Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a process manager like PM2 for production deployment
3. Configure reverse proxy (nginx) for SSL termination
4. Set up database backups and monitoring
5. Configure log rotation and monitoring

### Docker Deployment

A Dockerfile can be created for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## Monitoring and Logging

The application includes comprehensive logging for:
- API requests and responses
- Database operations
- Authentication events
- Error conditions
- Performance metrics

Logs are structured for easy parsing and analysis in production environments.

