# 🧪 RECOMENDADO: Estado Actual y Recomendaciones de Testing

## Resumen

El proyecto actualmente no tiene framework de testing configurado. Esta es una debilidad significativa que aumenta el riesgo de regresiones y dificulta el mantenimiento.

## Estado Actual

### package.json
```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

**Problemas**:
- ❌ Sin tests unitarios
- ❌ Sin tests de integración
- ❌ Sin cobertura de código
- ❌ Sin CI/CD para tests

## Riesgos por Falta de Testing

### 1. Regresiones No Detectadas
- Cambios en `message-creator.js` pueden romper formatos
- Modificaciones en parsers pueden corromper datos
- Sin validación automática de cambios

### 2. Dificultad para Refactoring
- Miedo a cambiar código existente
- No hay red de seguridad
- Deuda técnica se acumula

### 3. Debugging Complejo
- Errores se descubren en producción
- Difícil reproducir escenarios específicos
- Sin documentación ejecutable (tests)

## Framework de Testing Recomendado

### Stack Propuesto
```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "@types/jest": "^29.0.0",
    "jest-junit": "^15.0.0",
    "nyc": "^15.1.0"
  }
}
```

### Configuración Jest
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Tests Críticos a Implementar

### 1. Tests Unitarios para message-creator.js

```javascript
// __tests__/utils/message-creator.test.js
describe('MessageCreator', () => {
  describe('formatValue', () => {
    test('debe formatear campo alfanumérico con espacios a la derecha', () => {
      const result = formatValue('TEST', 10, 'X');
      expect(result).toBe('TEST      ');
      expect(result.length).toBe(10);
    });
    
    test('debe formatear campo numérico con ceros a la izquierda', () => {
      const result = formatValue('123', 6, '9');
      expect(result).toBe('000123');
      expect(result.length).toBe(6);
    });
    
    test('debe truncar valores que excedan la longitud', () => {
      const result = formatValue('VERYLONGTEXT', 5, 'X');
      expect(result).toBe('VERYL');
    });
  });
  
  describe('createMessage', () => {
    test('debe crear mensaje completo con header y data', () => {
      const headerStructure = {
        fields: [
          { name: 'CANAL', length: 4, type: 'X' },
          { name: 'SERVICIO', length: 4, type: '9' }
        ]
      };
      
      const serviceStructure = {
        request: {
          elements: [
            { name: 'CAMPO1', length: 10, type: 'X', fieldType: 'field' }
          ]
        }
      };
      
      const messageData = {
        header: { CANAL: 'SM', SERVICIO: '1004' },
        data: { CAMPO1: 'PRUEBA' }
      };
      
      const result = createMessage(headerStructure, serviceStructure, messageData, 'request');
      expect(result).toBe('SM  1004PRUEBA    ');
    });
  });
});
```

### 2. Tests Unitarios para message-analyzer.js

```javascript
// __tests__/utils/message-analyzer.test.js
describe('MessageAnalyzer', () => {
  describe('parseMessage', () => {
    test('debe parsear correctamente un mensaje válido', () => {
      const message = 'SM  1004PRUEBA    ';
      const headerStructure = {
        fields: [
          { name: 'CANAL', length: 4, type: 'X' },
          { name: 'SERVICIO', length: 4, type: '9' }
        ],
        totalLength: 8
      };
      
      const serviceStructure = {
        response: {
          elements: [
            { name: 'CAMPO1', length: 10, type: 'X', fieldType: 'field' }
          ]
        }
      };
      
      const result = parseMessage(message, headerStructure, serviceStructure);
      
      expect(result.header.CANAL).toBe('SM');
      expect(result.header.SERVICIO).toBe('1004');
      expect(result.data.CAMPO1).toBe('PRUEBA');
    });
  });
});
```

### 3. Tests de Integración para API

```javascript
// __tests__/routes/services.test.js
const request = require('supertest');
const app = require('../../server');

describe('Services API', () => {
  describe('POST /api/services/sendmessage', () => {
    test('debe convertir JSON a fixed string correctamente', async () => {
      const payload = {
        header: {
          serviceNumber: '1004',
          canal: 'SM'
        },
        parameters: {
          campo1: 'TEST',
          campo2: '123'
        }
      };
      
      const response = await request(app)
        .post('/api/services/sendmessage')
        .send(payload)
        .expect(200);
      
      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
    });
    
    test('debe rechazar request sin serviceNumber', async () => {
      const payload = {
        header: {
          canal: 'SM'
        }
      };
      
      const response = await request(app)
        .post('/api/services/sendmessage')
        .send(payload)
        .expect(400);
      
      expect(response.body.error).toContain('serviceNumber');
    });
  });
});
```

### 4. Tests de Carga

```javascript
// __tests__/load/stress.test.js
describe('Load Testing', () => {
  test('debe manejar 100 requests concurrentes', async () => {
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .get('/api/services')
          .expect(200)
      );
    }
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Menos de 5 segundos
  });
});
```

### 5. Tests de Regresión para Bugs Conocidos

```javascript
// __tests__/regression/known-issues.test.js
describe('Regression Tests', () => {
  test('debe manejar campos con caracteres especiales', () => {
    // Bug reportado: caracteres especiales rompen el parsing
    const value = 'TEST@#$%';
    const result = formatValue(value, 10, 'X');
    expect(result).toBe('TEST@#$%  ');
  });
  
  test('debe manejar occurrences vacías sin error', () => {
    // Bug reportado: occurrences sin datos causan crash
    const structure = {
      elements: [{
        type: 'occurrence',
        name: 'ITEMS',
        count: 0,
        fields: []
      }]
    };
    
    expect(() => {
      processOccurrence(structure, {});
    }).not.toThrow();
  });
});
```

## Estrategia de Implementación

### Fase 1: Setup Inicial (1 semana)
1. Instalar Jest y configurar
2. Crear estructura de carpetas para tests
3. Configurar scripts de npm
4. Crear primeros tests de ejemplo

### Fase 2: Tests Críticos (2 semanas)
1. Tests para message-creator.js (crítico)
2. Tests para message-analyzer.js (crítico)
3. Tests para service-lookup.js
4. Tests básicos de API endpoints

### Fase 3: Cobertura Completa (1 mes)
1. Alcanzar 80% de cobertura
2. Tests de integración completos
3. Tests de regresión
4. Tests de carga básicos

### Fase 4: CI/CD (2 semanas)
1. Configurar GitHub Actions
2. Tests automáticos en PR
3. Reporte de cobertura
4. Bloquear merge sin tests

## Configuración CI/CD Propuesta

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16.x'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Generate coverage report
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        
    - name: Run linting
      run: npm run lint
```

## Métricas de Calidad

### Objetivos Iniciales
- Cobertura de código: 60%
- Cobertura de branches: 50%
- Tests unitarios: 100+
- Tests de integración: 20+

### Objetivos a 6 Meses
- Cobertura de código: 85%
- Cobertura de branches: 80%
- Tests unitarios: 300+
- Tests de integración: 50+
- Tests E2E: 10+

## Beneficios Esperados

1. **Confianza en Cambios**: Refactoring sin miedo
2. **Documentación Viva**: Tests documentan comportamiento
3. **Detección Temprana**: Bugs encontrados antes de producción
4. **Mejor Diseño**: TDD mejora la arquitectura
5. **Onboarding Rápido**: Nuevos desarrolladores entienden via tests