// Script para probar la función getAvailableServices
const path = require('path');
const servicesRouter = require('./routes/services');

// Directorio de estructuras
const structuresDir = path.join(__dirname, 'structures');

// Forzar recarga de caché
async function testServices() {
  console.log("=== TEST DE SERVICIOS ===");
  console.log("Directorio de estructuras:", structuresDir);
  console.log("\nForzando recarga de caché de servicios...");
  
  try {
    // Llamar a getAvailableServices directamente
    const services = await servicesRouter.getAvailableServices(true);
    
    console.log(`\nServicios detectados: ${services.length}`);
    
    // Mostrar todos los servicios
    console.log("\nLISTA DE SERVICIOS:");
    services.forEach((service, index) => {
      console.log(`${index + 1}. Servicio ${service.service_number}: ${service.service_name}`);
      console.log(`   Archivo Excel: ${service.excel_file}`);
      console.log(`   Archivo Estructura: ${service.structure_file}`);
      console.log(`   Fecha: ${service.timestamp}`);
      console.log("---");
    });
    
    // Buscar específicamente el servicio 1010
    const service1010 = services.find(s => s.service_number === "1010");
    console.log("\n==== SERVICIO 1010 ====");
    
    if (service1010) {
      console.log("ENCONTRADO:", service1010);
    } else {
      console.log("NO ENCONTRADO. Servicios disponibles:");
      services.forEach(s => {
        console.log(`- ${s.service_number}: ${s.service_name}`);
      });
    }
    
  } catch (error) {
    console.error("ERROR:", error);
  }
}

// Ejecutar prueba
testServices();
