# Database Setup Guide

## Overview
The MQ Importer API now supports MySQL database connectivity using the Aiven cloud database service.

## Configuration

### Database Connection Details
```javascript
{
  host: 'mysql-aiven-arenazl.e.aivencloud.com',
  user: 'avnadmin',
  port: 23108,
  password: 'AVNS_Fqe0qsChCHnqSnVsvoi',
  database: 'defaultdev'
}
```

### Files Created
1. **`/config/database.js`** - Database connection module with connection pooling
2. **`/test-db-connection.js`** - Test script to verify database connectivity

### SSL Configuration
The database connection supports SSL for secure communication. To enable SSL:

1. Obtain the CA certificate from Aiven
2. Save it as `/config/ca.pem`
3. The connection will automatically use SSL when the certificate is present

Currently, the connection works without SSL verification (not recommended for production).

## Usage

### In Your Code
```javascript
const { query, getConnection } = require('./config/database');

// Simple query
const results = await query('SELECT * FROM users WHERE id = ?', [userId]);

// Using connection for transactions
const connection = await getConnection();
try {
  await connection.beginTransaction();
  // ... your queries
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### Testing Connection
Run the test script:
```bash
node test-db-connection.js
```

### Health Check
The `/health` endpoint now includes database connection status:
```bash
curl http://localhost:3000/health
```

## Server Integration
The database connection is automatically initialized when the server starts. If the connection fails, the server will continue running without database access.

## Available Tables
The database currently contains 48 tables including:
- User management tables (users, usuarios, roles)
- Transaction tables (orders, payments, etc.)
- Configuration tables
- Log tables

## Next Steps
1. Obtain and install the SSL certificate from Aiven
2. Create data models for your application needs
3. Implement database operations in your routes
4. Consider using an ORM like Sequelize for complex operations