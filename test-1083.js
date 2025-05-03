// Script específico para analizar el archivo 1083
const path = require('path');
const fs = require('fs');

// Importar el módulo de servicios para verificar la detección
const serviceRouter = require('./routes/services');

// Información del archivo
const fileName = '20250503T14205_SVO1083-Consulta de Impuestos V2.xls';
const filePath = path.join(__dirname, 'uploads', fileName);

console.log("=== ANÁLISIS ESPECÍFICO DEL ARCHIVO 1083 ===");
console.log("Archivo a analizar:", filePath);

// Verificar si el archivo existe
if (fs.existsSync(filePath)) {
  console.log("✅ El archivo EXISTE en la ruta indicada");
} else {
  console.log("❌ El archivo NO EXISTE en la ruta indicada");
}

// Intentar extraer el número de servicio con diferentes patrones
const patterns = [
  { regex: /SVO(\d+)(?:-|\s|$)/i, name: "SVO pattern with delimiter" },
  { regex: /SVO(\d+)/i, name: "SVO pattern" },
  { regex: /SVC(\d+)(?:-|\s|$)/i, name: "SVC pattern with delimiter" },
  { regex: /SVC(\d+)/i, name: "SVC pattern" },
  { regex: /[_-](\d{4})[_-]/i, name: "4-digit pattern" },
  { regex: /(\d{4})_structure/i, name: "Structure file pattern" },
  { regex: /(\d{4})/, name: "Simple 4-digit pattern" },
];

console.log("\nANÁLISIS DE PATRONES DE DETECCIÓN:");
let found = false;

for (const pattern of patterns) {
  const match = fileName.match(pattern.regex);
  if (match) {
    console.log(`✅ Patrón "${pattern.name}" COINCIDE:`);
    console.log(`   Regex: ${pattern.regex}`);
    console.log(`   Grupos capturados: [${match.map((m, i) => `${i}: "${m}"`).join(', ')}]`);
    
    // Extraer el número de servicio (primer grupo de captura)
    if (match[1]) {
      console.log(`   Número de servicio detectado: "${match[1]}"`);
      found = true;
    }
  } else {
    console.log(`❌ Patrón "${pattern.name}" NO coincide`);
  }
}

if (!found) {
  console.log("\n❌ NINGÚN PATRÓN detectó correctamente el número de servicio");
} else {
  console.log("\n✅ Al menos un patrón detectó correctamente el número de servicio");
}

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
    
    // Buscar específicamente el servicio 1083
    const service1083 = services.find(s => s.service_number === "1083");
    console.log("\n==== SERVICIO 1083 ====");
    
    if (service1083) {
      console.log("✅ ENCONTRADO:", service1083);
    } else {
      console.log("❌ NO ENCONTRADO entre los servicios disponibles");
    }
  } catch (error) {
    console.error("ERROR:", error);
  }
}

// Ejecutar prueba de detección real
testRealDetection();
