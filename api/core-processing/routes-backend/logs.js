const express = require('express');
const router = express.Router();
const { getRequestLogs } = require('../../../middleware/request-logger');
const fs = require('fs');
const path = require('path');

/**
 * GET /logs/requests
 * Obtener logs de peticiones con filtros opcionales
 */
router.get('/requests', (req, res) => {
    try {
        const {
            startDate,
            endDate,
            endpoint,
            method,
            statusCode,
            limit = 100
        } = req.query;

        const options = {
            limit: parseInt(limit)
        };

        if (startDate) options.startDate = new Date(startDate);
        if (endDate) options.endDate = new Date(endDate);
        if (endpoint) options.endpoint = endpoint;
        if (method) options.method = method;
        if (statusCode) options.statusCode = parseInt(statusCode);

        const logs = getRequestLogs(options);

        res.json({
            success: true,
            count: logs.length,
            filters: {
                startDate: options.startDate || 'últimas 24 horas',
                endDate: options.endDate || 'ahora',
                endpoint,
                method,
                statusCode,
                limit
            },
            logs
        });
    } catch (error) {
        console.error('Error al obtener logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /logs/summary
 * Obtener resumen de logs (endpoints más usados, errores frecuentes, etc.)
 */
router.get('/summary', (req, res) => {
    try {
        const logs = getRequestLogs({ limit: 1000 });
        
        // Análisis de endpoints
        const endpointStats = {};
        const errorStats = {};
        const methodStats = {};
        let totalRequests = 0;
        let totalErrors = 0;
        let totalDuration = 0;

        logs.forEach(log => {
            totalRequests++;
            
            // Estadísticas por endpoint
            const endpoint = log.endpoint || 'unknown';
            if (!endpointStats[endpoint]) {
                endpointStats[endpoint] = { count: 0, avgDuration: 0, errors: 0 };
            }
            endpointStats[endpoint].count++;
            
            // Estadísticas por método
            const method = log.method || 'unknown';
            if (!methodStats[method]) {
                methodStats[method] = 0;
            }
            methodStats[method]++;
            
            // Duración
            if (log.response && log.response.duration) {
                const duration = parseInt(log.response.duration);
                if (!isNaN(duration)) {
                    totalDuration += duration;
                    endpointStats[endpoint].avgDuration = 
                        (endpointStats[endpoint].avgDuration * (endpointStats[endpoint].count - 1) + duration) / 
                        endpointStats[endpoint].count;
                }
            }
            
            // Errores
            if (log.response && log.response.statusCode >= 400) {
                totalErrors++;
                endpointStats[endpoint].errors++;
                
                const errorCode = log.response.statusCode;
                if (!errorStats[errorCode]) {
                    errorStats[errorCode] = { count: 0, endpoints: {} };
                }
                errorStats[errorCode].count++;
                
                if (!errorStats[errorCode].endpoints[endpoint]) {
                    errorStats[errorCode].endpoints[endpoint] = 0;
                }
                errorStats[errorCode].endpoints[endpoint]++;
            }
        });

        // Top 10 endpoints más usados
        const topEndpoints = Object.entries(endpointStats)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([endpoint, stats]) => ({
                endpoint,
                ...stats,
                avgDuration: Math.round(stats.avgDuration) + 'ms'
            }));

        res.json({
            success: true,
            summary: {
                totalRequests,
                totalErrors,
                errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%' : '0%',
                avgResponseTime: totalRequests > 0 ? Math.round(totalDuration / totalRequests) + 'ms' : '0ms',
                period: {
                    from: logs.length > 0 ? logs[0].timestamp : null,
                    to: logs.length > 0 ? logs[logs.length - 1].timestamp : null
                }
            },
            topEndpoints,
            methodDistribution: methodStats,
            errorDistribution: errorStats
        });
    } catch (error) {
        console.error('Error al generar resumen:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /logs/files
 * Listar archivos de log disponibles
 */
router.get('/files', (req, res) => {
    try {
        const logDir = path.join(__dirname, '..', 'logs', 'requests');
        
        if (!fs.existsSync(logDir)) {
            return res.json({
                success: true,
                files: []
            });
        }

        const files = fs.readdirSync(logDir)
            .filter(file => file.endsWith('.log'))
            .map(file => {
                const stats = fs.statSync(path.join(logDir, file));
                return {
                    name: file,
                    size: (stats.size / 1024).toFixed(2) + ' KB',
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));

        res.json({
            success: true,
            count: files.length,
            files
        });
    } catch (error) {
        console.error('Error al listar archivos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /logs/services-endpoints
 * Devuelve todos los endpoints definidos en services.js (método y path)
 */
router.get('/services-endpoints', (req, res) => {
    // Lista manual de endpoints de services.js
    // Si se agregan más, deben actualizarse aquí o automatizar con express-list-endpoints
    const endpoints = [
        { method: 'GET', path: '/api/services' },
        { method: 'POST', path: '/api/services/generate' },
        { method: 'POST', path: '/api/services/create-header' },
        { method: 'POST', path: '/api/services/process' },
        { method: 'GET', path: '/api/services/refresh' },
        { method: 'GET', path: '/api/services/files' },
        { method: 'GET', path: '/api/services/versions' },
        { method: 'GET', path: '/api/services/:serviceNumber' },
        // Montados desde ida-routes, vuelta-routes, example-generation-routes
        { method: 'POST', path: '/api/services/sendmessage' },
        { method: 'POST', path: '/api/services/receivemessage' },
        { method: 'GET', path: '/api/services/ida/structure' },
        { method: 'GET', path: '/api/services/vuelta/structure' },
        { method: 'POST', path: '/api/services/examples/generate-example-response' },
        { method: 'GET', path: '/api/services/examples/list' }
    ];
    res.json({ endpoints });
});

module.exports = router;