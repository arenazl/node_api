const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: path.join(logDir, 'api.txt'), maxsize: 10485760, maxFiles: 5 })
  ]
});

// Add a console transport for development if not in production - DISABLED for clean startup
// Only show critical errors in console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    level: 'error',  // Solo errores en consola
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

module.exports = logger; 