# Backend Architecture and Database Schema Design

## Project Overview

Based on the analysis of the frontend application, this is a comprehensive billing and client management system (BillFlow) designed for electrical contracting businesses. The application includes features for client management, invoice generation, payment tracking, delivery notes, document templates, and advanced reporting capabilities.

## Technology Stack Recommendation

For this project, I recommend using **Express.js** with **TypeScript** for the backend, paired with **MySQL** as the database. This choice is based on several factors:

### Why Express.js?
- **Mature ecosystem**: Extensive middleware and library support
- **Performance**: Fast and lightweight framework
- **TypeScript support**: Excellent type safety and development experience
- **Local deployment**: Easy to package and deploy on desktop computers
- **Community**: Large community and extensive documentation

### Why MySQL?
- **Reliability**: Proven database for business applications
- **Local installation**: Can be easily installed on desktop computers
- **ACID compliance**: Ensures data integrity for financial transactions
- **Performance**: Excellent performance for the expected data volumes
- **Backup and recovery**: Robust backup solutions for business data

## Database Schema Design

### Core Entities

#### 1. Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'commercial') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. Clients Table
```sql
CREATE TABLE clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('local', 'foreign') NOT NULL,
    classification ENUM('new', 'recurring', 'good', 'very_good') NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    siret VARCHAR(50),
    revenue DECIMAL(15,2) DEFAULT 0,
    tva_rate DECIMAL(5,2) DEFAULT 19.00,
    has_tva BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. Invoices Table
```sql
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    number VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    type ENUM('proforma', 'definitive', 'credit_note') NOT NULL,
    client_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('paid', 'pending', 'overdue') DEFAULT 'pending',
    payment_method VARCHAR(50),
    project_name VARCHAR(255),
    billing_period VARCHAR(100),
    contract_ref VARCHAR(100),
    order_ref VARCHAR(100),
    observations TEXT,
    tva_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_invoice_number_type (number, type)
);
```

#### 4. Invoice Lines Table
```sql
CREATE TABLE invoice_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

#### 5. Payments Table
```sql
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    method ENUM('cash', 'bank_transfer', 'check', 'card', 'other') NOT NULL,
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
```

#### 6. Delivery Notes Table
```sql
CREATE TABLE delivery_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    number VARCHAR(20) UNIQUE NOT NULL,
    date DATE NOT NULL,
    client_id INT NOT NULL,
    designation TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
```

#### 7. Document Templates Table
```sql
CREATE TABLE document_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('invoice', 'quote', 'delivery_note') NOT NULL,
    is_default BOOLEAN DEFAULT false,
    template_config JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints Design

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Client Management Endpoints
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get specific client
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client
- `GET /api/clients/:id/statistics` - Get client statistics

### Invoice Management Endpoints
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get specific invoice
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/:id/convert` - Convert invoice type
- `GET /api/invoices/next-number/:type` - Get next invoice number

### Payment Tracking Endpoints
- `GET /api/payments` - Get all payments
- `GET /api/payments/invoice/:invoiceId` - Get payments for specific invoice
- `POST /api/payments` - Record new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Delivery Notes Endpoints
- `GET /api/delivery-notes` - Get all delivery notes
- `GET /api/delivery-notes/:id` - Get specific delivery note
- `POST /api/delivery-notes` - Create new delivery note
- `PUT /api/delivery-notes/:id` - Update delivery note
- `DELETE /api/delivery-notes/:id` - Delete delivery note

### Document Templates Endpoints
- `GET /api/templates` - Get all document templates
- `GET /api/templates/:id` - Get specific template
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `PUT /api/templates/:id/set-default` - Set template as default

### Reporting Endpoints
- `GET /api/reports/advanced` - Get advanced reporting data
- `GET /api/reports/revenue` - Get revenue statistics
- `GET /api/reports/clients` - Get client performance data

## Security Considerations

### Authentication and Authorization
- JWT-based authentication for session management
- Role-based access control (admin vs commercial users)
- Password hashing using bcrypt
- Session timeout and refresh token mechanism

### Data Protection
- Input validation and sanitization
- SQL injection prevention using parameterized queries
- XSS protection with proper data encoding
- CORS configuration for frontend-backend communication

### Local Deployment Security
- Environment-based configuration
- Secure default settings
- Database connection encryption
- File system permissions

## Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Foreign key constraints for data integrity
- Query optimization for reporting endpoints
- Connection pooling for database connections

### API Optimization
- Response caching for static data
- Pagination for large datasets
- Compression middleware
- Request rate limiting

## Backup and Data Management

### Backup Strategy
- Automated daily database backups
- Export functionality for data portability
- Import functionality for data restoration
- Configuration backup for templates and settings

### Data Migration
- Database migration scripts for schema updates
- Data seeding for initial setup
- Version control for database schema changes

## Development and Deployment

### Development Environment
- Docker containerization for consistent development
- Environment variable configuration
- Hot reloading for development
- Comprehensive logging system

### Local Deployment
- Standalone executable packaging
- Installer for desktop deployment
- Automatic database setup
- Configuration wizard for initial setup

This architecture provides a solid foundation for a robust, scalable, and maintainable billing and client management system that can be deployed locally on desktop computers while maintaining professional-grade features and security.

