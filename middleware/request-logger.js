const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Crear directorio de logs si no existe
const fs = require('fs');
const logDir = 'logs/requests';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configurar rotación de archivos
const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'api-requests-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
});

// Crear logger
const requestLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        fileRotateTransport,
        new winston.transports.File({
            filename: path.join(logDir, 'api-requests-current.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// En desarrollo, también log en consola
if (process.env.NODE_ENV !== 'production') {
    requestLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Middleware de logging NO invasivo
const requestLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Capturar información de entrada
    const requestInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.originalUrl,
        path: req.path,
        query: req.query || {},
        params: req.params || {},
        body: req.body || {},
        headers: {
            'user-agent': req.headers['user-agent'] || '',
            'referer': req.headers['referer'] || '',
            'origin': req.headers['origin'] || '',
            'host': req.headers['host'] || '',
            'content-type': req.headers['content-type'] || '',
            'x-forwarded-for': req.headers['x-forwarded-for'] || '',
            'accept-language': req.headers['accept-language'] || '',
            'accept-encoding': req.headers['accept-encoding'] || ''
        },
        ip: req.ip || req.connection?.remoteAddress || '',
        user: req.user || 'anonymous',
        error: null
    };

    // CAPTURA PASIVA SIN INTERCEPTAR - Solo observamos el response body
    const chunks = [];
    let errorCaught = null;

    // Interceptar SOLO para capturar datos sin alterarlos
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function(chunk) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }
        return originalWrite.apply(this, arguments);
    };

    res.end = function(chunk) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }
        return originalEnd.apply(this, arguments);
    };

    // Capturar errores de la respuesta
    res.on('error', (err) => {
        errorCaught = err;
    });

    // Al finalizar la respuesta - LOGGING PASIVO
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Reconstruir response body de manera segura
        let responseBody = '[No body]';
        try {
            if (chunks.length > 0) {
                const fullBuffer = Buffer.concat(chunks);
                responseBody = fullBuffer.toString('utf8');
                
                // Limitar tamaño solo para logging, no afecta la respuesta original
                const maxLength = 50000; // 50KB para logs
                if (responseBody.length > maxLength) {
                    const truncateMsg = `... [truncado en logs - ${responseBody.length} caracteres totales]`;
                    responseBody = responseBody.substring(0, maxLength - truncateMsg.length) + truncateMsg;
                }
            }
        } catch (error) {
            responseBody = `[Error capturando body: ${error.message}]`;
        }

        // Información completa del request/response
        const logEntry = {
            ...requestInfo,
            response: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                duration: `${duration}ms`,
                headers: res.getHeaders ? res.getHeaders() : {},
                body: responseBody
            },
            error: errorCaught ? String(errorCaught) : null
        };

        // Log según el código de respuesta
        if (res.statusCode >= 400 || errorCaught) {
            requestLogger.error('API Request Error', logEntry);
        } else {
            requestLogger.info('API Request Success', logEntry);
        }

        // Log resumido en consola solo para errores
        if (process.env.NODE_ENV !== 'production' && (res.statusCode >= 400 || errorCaught)) {
            console.log(`[ERROR] ${logEntry.method} ${logEntry.endpoint} - ${logEntry.response.statusCode} - ${logEntry.response.duration}`);
        }
    });

    // Capturar errores de conexión cerrada
    res.on('close', () => {
        if (!res.headersSent) {
            const duration = Date.now() - startTime;
            const logEntry = {
                ...requestInfo,
                response: {
                    statusCode: res.statusCode || 0,
                    statusMessage: res.statusMessage || 'Connection closed',
                    duration: `${duration}ms`,
                    headers: res.getHeaders ? res.getHeaders() : {},
                    body: '[Connection closed before response completed]'
                },
                error: errorCaught ? String(errorCaught) : '[Connection closed before response]'
            };
            requestLogger.error('API Request Error (Connection closed)', logEntry);
        }
    });

    next();
};

// Función para obtener logs
const getRequestLogs = (options = {}) => {
    const { 
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), 
        endDate = new Date(),
        endpoint = null,
        method = null,
        statusCode = null,
        limit = 100
    } = options;

    const logFile = path.join(logDir, 'api-requests-current.log');
    
    if (!fs.existsSync(logFile)) {
        return [];
    }

    const logs = fs.readFileSync(logFile, 'utf-8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        })
        .filter(log => log !== null)
        .filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= startDate && logDate <= endDate;
        })
        .filter(log => !endpoint || log.endpoint.includes(endpoint))
        .filter(log => !method || log.method === method)
        .filter(log => !statusCode || log.response?.statusCode === statusCode)
        .slice(-limit);

    return logs;
};

module.exports = {
    requestLoggerMiddleware,
    requestLogger,
    getRequestLogs
};
