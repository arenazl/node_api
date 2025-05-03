// Script específico para analizar el archivo 1010
const path = require('path');
const fs = require('fs');

// Información del archivo
const fileName = '20250503T14123_SVO1010-Consulta Productos por NIC.XLS';
const filePath = path.join(__dirname, 'uploads', fileName);

console.log("=== ANÁLISIS ESPECÍFICO DEL ARCHIVO 1010 ===");
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

// Intentar cargar el Excel para ver si se parsea correctamente
console.log("\nINTENTANDO CARGAR EL EXCEL DIRECTAMENTE:");
try {
  const excelParser = require('./utils/excel-parser');
  const structure = excelParser.parseServiceStructure(filePath);
  console.log("✅ Excel cargado exitosamente");
  console.log("- Número de servicio:", structure.serviceNumber);
  console.log("- Nombre del servicio:", structure.serviceName);
} catch (error) {
  console.error("❌ Error al cargar el Excel:", error.message);
}
