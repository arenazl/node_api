/**
 * Configuración de PM2 para ejecutar la API como servicio
 * Use este archivo con: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'mq-importer-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    }
  }]
};
