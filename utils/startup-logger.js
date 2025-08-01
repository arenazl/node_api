// Variables para tracking de requests
let requestCount = 0;
let errorCount = 0;
let startTime = Date.now();

// Función para mostrar banner de inicio
function showStartupBanner(port) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 MQ Importer API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Puerto: ${port}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Estado: ✓ Activo`);
    console.log(`🔗 URL: http://localhost:${port}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Función para mostrar resumen periódico
function showPeriodicSummary() {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;
    
    console.log(`⏱️  Uptime: ${minutes}m ${seconds}s | 📥 Requests: ${requestCount} | ❌ Errores: ${errorCount}`);
}

// Middleware simplificado para contar requests
function requestCounter(req, res, next) {
    requestCount++;
    
    // Capturar el status code cuando termine
    res.on('finish', () => {
        if (res.statusCode >= 400) {
            errorCount++;
        }
    });
    
    next();
}

// Función para manejar errores sin mostrar stack trace completo
function logError(error) {
    console.log(`❌ Error: ${error.message || error}`);
    if (process.env.VERBOSE_LOGS === 'true') {
        console.log(error.stack);
    }
}

// Iniciar timer para mostrar resumen cada 5 minutos
function startPeriodicSummary() {
    setInterval(showPeriodicSummary, 300000); // 5 minutos
}

module.exports = {
    showStartupBanner,
    showPeriodicSummary,
    requestCounter,
    logError,
    startPeriodicSummary
};