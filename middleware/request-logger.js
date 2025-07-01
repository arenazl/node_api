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

// Middleware de logging mejorado
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
        error: null // Se llenará si ocurre un error
    };

    // Capturar TODAS las formas de respuesta
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    let responseBody;
    let errorCaught = null;

    res.send = function(data) {
        responseBody = data;
        return originalSend.call(this, data);
    };

    res.json = function(data) {
        responseBody = data;
        return originalJson.call(this, data);
    };

    res.end = function(data) {
        if (data) responseBody = data;
        return originalEnd.call(this, data);
    };

    // Capturar errores de la respuesta
    res.on('error', (err) => {
        errorCaught = err;
    });

    // Al finalizar la respuesta
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Serializar body y responseBody de forma segura
        function safeStringify(obj) {
            try {
                // Manejar casos especiales
                if (obj === undefined) return '[undefined]';
                if (obj === null) return '[null]';
                if (obj === '') return '[empty string]';
                
                // Si es un Buffer, indicarlo
                if (Buffer.isBuffer(obj)) {
                    return `[Buffer: ${obj.length} bytes]`;
                }
                
                // Convertir a string
                let str = typeof obj === 'string' ? obj : JSON.stringify(obj);
                
                // Limitar longitud solo si es necesario (aumentado significativamente)
                const maxLength = 10000000; // 100KB en lugar de 10KB
                if (str.length > maxLength) {
                    // Intentar mantener JSON válido si es posible
                    const truncateMsg = '... [truncado en servidor - ' + str.length + ' caracteres totales]';
                    if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
                        // Es JSON, intentar truncar de forma inteligente
                        str = str.substring(0, maxLength - truncateMsg.length - 10) + truncateMsg + (str.trim().startsWith('{') ? '}' : ']');
                    } else {
                        str = str.substring(0, maxLength - truncateMsg.length) + truncateMsg;
                    }
                }
                
                return str;
            } catch (error) {
                return `[Unserializable: ${error.message}]`;
            }
        }

        // Información completa del request/response
        const logEntry = {
            ...requestInfo,
            response: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                duration: `${duration}ms`,
                headers: res.getHeaders ? res.getHeaders() : {},
                body: responseBody !== undefined ? safeStringify(responseBody) : '[No body]'
            },
            error: errorCaught ? safeStringify(errorCaught) : null
        };

        // Log según el código de respuesta
        if (res.statusCode >= 400 || errorCaught) {
            requestLogger.error('API Request Error', logEntry);
        } else {
            requestLogger.info('API Request Success', logEntry);
        }

        // Log resumido en consola para desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.endpoint} - ${logEntry.response.statusCode} - ${logEntry.response.duration}`);
        }
    });

    // Capturar errores de middleware y registrar
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
                    body: responseBody !== undefined ? safeStringify(responseBody) : '[No body - connection closed]'
                },
                error: errorCaught ? safeStringify(errorCaught) : '[Connection closed before response]'
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