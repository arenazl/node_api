// Script específico para analizar el archivo 1041
const path = require('path');
const fs = require('fs');

// Importar el parser mejorado para verificar los cambios
const enhancedParser = require('./utils/excel-parser-enhanced');
// Importar el módulo de servicios para verificar la detección
const serviceRouter = require('./routes/services');

// Información del archivo
const fileName = 'Copia de SVO1041-Consulta Territorio_.xls';
const filePath = path.join(__dirname, 'warning_files', `WARNING_20250503T15045_${fileName}`);

console.log("=== ANÁLISIS ESPECÍFICO DEL ARCHIVO 1041 ===");
console.log("Archivo a analizar:", filePath);

// Verificar si el archivo existe
if (fs.existsSync(filePath)) {
  console.log("✅ El archivo EXISTE en la ruta indicada");
} else {
  console.log("❌ El archivo NO EXISTE en la ruta indicada");
  // Intentar buscar en otras ubicaciones posibles
  const uploadsPath = path.join(__dirname, 'uploads', fileName);
  if (fs.existsSync(uploadsPath)) {
    console.log(`✅ Archivo encontrado en uploads: ${uploadsPath}`);
    filePath = uploadsPath;
  } else {
    console.log("⚠️ Buscando archivos similares en uploads...");
    const files = fs.readdirSync(path.join(__dirname, 'uploads'))
      .filter(f => f.includes('1041'));
    
    if (files.length > 0) {
      console.log(`Archivos similares encontrados: ${files.join(', ')}`);
      filePath = path.join(__dirname, 'uploads', files[0]);
      console.log(`✅ Usando archivo: ${filePath}`);
    }
  }
}

// Función principal de prueba
async function testEnhancedParser() {
  try {
    console.log("\n=== PROBANDO PARSER MEJORADO PARA 1041 ===");
    console.log("Analizando casos especiales:");
    console.log("1. Respuesta con texto adicional ('RESPUESTA Para Consulta de Territorio')");
    console.log("2. Filas descriptivas que deben ignorarse ('Información agregada, para Consulta de Territorio')");
    
    // Usar el parser mejorado
    const result = enhancedParser.parseServiceStructureDetailed(filePath);
    
    // Verificar si la estructura se generó correctamente
    if (result && result.serviceNumber) {
      console.log(`\n✅ Estructura generada correctamente para servicio ${result.serviceNumber}`);
      console.log(`Nombre del servicio: ${result.serviceName}`);
      console.log(`Elementos en request: ${result.request.elements.length}`);
      console.log(`Elementos en response: ${result.response.elements.length}`);
      
      // Verificar si hay elementos en la respuesta (crítico para este caso)
      if (result.response.elements.length > 0) {
        console.log("\n✅ DETECCIÓN EXITOSA - Sección RESPUESTA procesada correctamente");
        
        // Buscar la fila problemática
        const infoAgregadaField = result.response.elements.find(
          element => element.type === 'field' && 
                    element.name && 
                    element.name.includes('Información agregada')
        );
        
        if (!infoAgregadaField) {
          console.log("✅ ÉXITO - La fila 'Información agregada, para Consulta de Territorio' fue correctamente ignorada");
        } else {
          console.log("❌ ERROR - La fila descriptiva fue incorrectamente incluida en la estructura");
        }
        
        // Listar los primeros 5 campos para verificar
        console.log("\nPrimeros campos en RESPONSE:");
        for (let i = 0; i < Math.min(5, result.response.elements.length); i++) {
          const field = result.response.elements[i];
          console.log(`  ${i+1}. ${field.name || 'sin nombre'} (${field.type}) - longitud: ${field.length || 0}`);
        }
      } else {
        console.log("❌ ERROR - No se detectaron elementos en la sección RESPONSE");
      }
      
      // Verificar si hay errores en la respuesta
      if (result.parse_errors_response && result.parse_errors_response.length > 0) {
        console.log("\n⚠️ Errores en sección RESPONSE:");
        result.parse_errors_response.forEach((error, i) => {
          console.log(`  ${i+1}. ${error.message} (fila ${error.row}, col ${error.column})`);
        });
      }
    } else {
      console.log("❌ ERROR - No se pudo generar la estructura");
      console.log("Errores:", result.parse_errors);
    }
  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
}

// Ejecutar prueba
testEnhancedParser();

// Probar la detección con el código real del sistema
async function testRealDetection() {
  console.log("\n=== PROBANDO DETECCIÓN CON CÓDIGO REAL DEL SISTEMA ===");
  
  try {
    // Forzar recarga de caché
    console.log("Forzando recarga de caché de servicios...");
    const services = await serviceRouter.getAvailableServices(true);
    
    console.log(`\nServicios detectados: ${services.length}`);
    
    // Mostrar todos los servicios
    console.log("\nLISTA DE SERVICIOS DETECTADOS:");
    services.forEach((service, index) => {
      console.log(`${index + 1}. Servicio ${service.service_number}: ${service.service_name}`);
      console.log(`   Archivo Excel: ${service.excel_file}`);
    });
    
    // Buscar específicamente el servicio 1041
    const service1041 = services.find(s => s.service_number === "1041");
    console.log("\n==== SERVICIO 1041 ====");
    
    if (service1041) {
      console.log("✅ ENCONTRADO:", service1041);
    } else {
      console.log("❌ NO ENCONTRADO entre los servicios disponibles");
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

// Ejecutar prueba de detección real
testRealDetection();
