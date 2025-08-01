const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let sslConfig = false;
const certPath = path.join(__dirname, 'ca.pem');

if (fs.existsSync(certPath)) {
  const sslCert = fs.readFileSync(certPath, 'utf-8');
  sslConfig = {
    ca: sslCert,
    rejectUnauthorized: true
  };
} else {
  console.warn('⚠️  SSL certificate not found at:', certPath);
  console.warn('⚠️  Create ca.pem file in config/ directory for secure connection');
  console.warn('⚠️  Attempting connection without SSL verification...');
  sslConfig = {
    rejectUnauthorized: false
  };
}

const dbConfig = {
  host: 'mysql-aiven-arenazl.e.aivencloud.com',
  user: 'avnadmin',
  port: 23108,
  password: 'AVNS_Fqe0qsChCHnqSnVsvoi',
  database: 'SimImporter',
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    connection.release();
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function getConnection() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  return pool.getConnection();
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection pool closed');
  }
}

module.exports = {
  initializeDatabase,
  query,
  getConnection,
  closeDatabase,
  dbConfig
};