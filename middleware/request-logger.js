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

    // Capturar el body original de la respuesta
    const originalSend = res.send;
    let responseBody;
    let errorCaught = null;

    res.send = function(data) {
        responseBody = data;
        originalSend.call(this, data);
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
                let str = typeof obj === 'string' ? obj : JSON.stringify(obj);
                if (str.length > 2000) str = str.substring(0, 2000) + '...';
                return str;
            } catch {
                return '[Unserializable]';
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
                body: safeStringify(responseBody)
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
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    duration: `${duration}ms`,
                    headers: res.getHeaders ? res.getHeaders() : {},
                    body: safeStringify(responseBody)
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