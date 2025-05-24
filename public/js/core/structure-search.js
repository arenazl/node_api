/**
 * Script para manejar la búsqueda y visualización de estructuras
 */

// Elementos del DOM
const structureSearchInput = document.getElementById('structureSearchInput');
const structureAutocompleteResults = document.getElementById('structureAutocompleteResults');
const structuresList = document.getElementById('structuresList');
const noStructuresMessage = document.getElementById('noStructuresMessage');

// Almacenamiento para las estructuras
let allStructures = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Cargar las estructuras al iniciar
  loadStructures();
  
  // Agregar eventos
  initStructureSearch();
});

/**
 * Inicializa la funcionalidad de búsqueda
 */
function initStructureSearch() {
  if (structureSearchInput) {
    structureSearchInput.addEventListener('input', handleStructureSearch);
    
    // Ocultar autocomplete al hacer clic fuera
    document.addEventListener('click', function(e) {
      if (!structureSearchInput.contains(e.target) && !structureAutocompleteResults.contains(e.target)) {
        structureAutocompleteResults.style.display = 'none';
      }
    });
  }
}

/**
 * Maneja la búsqueda en tiempo real
 * @param {Event} event - Evento de input
 */
function handleStructureSearch(event) {
  const searchTerm = event.target.value.trim().toLowerCase();
  
  if (searchTerm === '') {
    // Ocultar autocomplete cuando la búsqueda está vacía
    structureAutocompleteResults.style.display = 'none';
    
    // Mostrar todas las estructuras
    displayStructures(allStructures);
    return;
  }
  
  // Filtrar estructuras por el término de búsqueda
  const matchingStructures = allStructures.filter(structure => {
    const serviceName = structure.service_name || '';
    const serviceNumber = structure.service_number || '';
    const timestamp = structure.timestamp || '';
    
    return serviceName.toLowerCase().includes(searchTerm) || 
           serviceNumber.toString().includes(searchTerm) ||
           timestamp.toLowerCase().includes(searchTerm);
  });
  
  // Poblar resultados de autocompletado
  populateAutocomplete(matchingStructures, searchTerm);
  
  // Actualizar la lista principal
  displayStructures(matchingStructures);
}

/**
 * Rellena la lista de autocompletado con las estructuras coincidentes
 * @param {Array} matchingStructures - Estructuras coincidentes
 * @param {string} searchTerm - Término de búsqueda
 */
function populateAutocomplete(matchingStructures, searchTerm) {
  structureAutocompleteResults.innerHTML = '';
  
  if (matchingStructures.length > 0) {
    structureAutocompleteResults.style.display = 'block';
    
    // Limitar a 5 resultados para el autocomplete
    const limitedResults = matchingStructures.slice(0, 5);
    
    limitedResults.forEach(structure => {
      const resultItem = document.createElement('div');
      resultItem.className = 'autocomplete-item';
      
      // Crear texto de visualización
      const displayText = `${structure.service_number} - ${structure.service_name}`;
      resultItem.textContent = displayText;
      
      // Agregar evento al hacer clic
      resultItem.addEventListener('click', () => {
        loadStructure(structure.structure_file);
        structureSearchInput.value = displayText;
        structureAutocompleteResults.style.display = 'none';
      });
      
      structureAutocompleteResults.appendChild(resultItem);
    });
  } else {
    structureAutocompleteResults.style.display = 'block';
    
    const noResults = document.createElement('div');
    noResults.className = 'autocomplete-item';
    noResults.textContent = 'No se encontraron estructuras';
    noResults.style.fontStyle = 'italic';
    noResults.style.color = 'var(--text-secondary)';
    
    structureAutocompleteResults.appendChild(noResults);
  }
}

/**
 * Carga las estructuras disponibles
 */
async function loadStructures() {
  try {
    // Obtener los archivos de estructura directamente desde el endpoint de estructura
    const response = await fetch('/excel/structures');
    
    if (!response.ok) {
      // Si el endpoint no existe, intentar obtenerlos del endpoint de archivos
      return await loadStructuresFromFiles();
    }
    
    const data = await response.json();
    
    if (data.structures && Array.isArray(data.structures)) {
      allStructures = data.structures.map(structure => ({
        structure_file: structure,
        service_number: extractServiceNumber(structure),
        service_name: formatServiceName(structure),
        upload_date: formatTimestamp(structure)
      }));
      
      // Mostrar las estructuras
      displayStructures(allStructures);
    } else {
      // Si no se obtienen estructuras del endpoint específico, intentar obtenerlas de los archivos
      await loadStructuresFromFiles();
    }
    
  } catch (error) {
    console.error('Error al cargar estructuras:', error);
    await loadStructuresFromFiles(); // Intentar el método alternativo
  }
}

/**
 * Carga las estructuras a partir de los archivos
 */
async function loadStructuresFromFiles() {
  try {
    const response = await fetch('/excel/files');
    
    if (!response.ok) {
      throw new Error('Error al cargar la lista de archivos');
    }
    
    const data = await response.json();
    
    if (data.files && Array.isArray(data.files)) {
      // Filtrar solo los archivos que tienen estructura asociada
      const structureFiles = data.files.filter(file => file.structure_file);
      allStructures = structureFiles;
      
      // Mostrar las estructuras
      displayStructures(structureFiles);
    } else {
      displayStructures([]);
    }
  } catch (error) {
    console.error('Error al cargar estructuras desde archivos:', error);
    displayStructures([]);
  }
}

/**
 * Extrae el número de servicio del nombre del archivo de estructura
 * @param {string} filename - Nombre del archivo de estructura
 * @returns {string} - Número de servicio o cadena vacía
 */
function extractServiceNumber(filename) {
  if (!filename) return '';
  
  // Intenta extraer un número de 4 dígitos del nombre del archivo
  const match = filename.match(/_(\d{4})_/);
  return match ? match[1] : '';
}

/**
 * Formatea el nombre del servicio a partir del nombre del archivo
 * @param {string} filename - Nombre del archivo de estructura
 * @returns {string} - Nombre del servicio formateado
 */
function formatServiceName(filename) {
  if (!filename) return 'Sin nombre';
  
  // Eliminar extensión y timestamp
  let name = filename.replace(/\.json$/, '');
  
  // Si contiene un timestamp al inicio, eliminarlo
  name = name.replace(/^\d{14}T\d{6}_/, '');
  
  // Formatear para mostrar
  const serviceNum = extractServiceNumber(name);
  if (serviceNum) {
    return `Servicio ${serviceNum}`;
  }
  
  return name;
}

/**
 * Formatea el timestamp del archivo de estructura
 * @param {string} filename - Nombre del archivo de estructura
 * @returns {string} - Fecha formateada
 */
function formatTimestamp(filename) {
  if (!filename) return '';
  
  // Intenta extraer el timestamp del formato "YYYYMMDDTHHMMSS"
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [_, year, month, day, hour, minute, second] = match;
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }
  
  return 'Fecha desconocida';
}

/**
 * Muestra las estructuras en el panel
 * @param {Array} structures - Estructuras a mostrar
 */
function displayStructures(structures) {
  if (!structuresList) return;
  
  // Limpiar la lista (excepto el mensaje de "no hay estructuras")
  while (structuresList.firstChild) {
    if (structuresList.firstChild === noStructuresMessage) break;
    structuresList.removeChild(structuresList.firstChild);
  }
  
  // Mostrar mensaje si no hay estructuras
  if (!structures || structures.length === 0) {
    if (noStructuresMessage) noStructuresMessage.style.display = 'block';
    return;
  }
  
  // Ocultar mensaje de "no hay estructuras"
  if (noStructuresMessage) noStructuresMessage.style.display = 'none';
  
  // Agregar cada estructura a la lista
  structures.forEach(structure => {
    if (!structure.structure_file) return; // Saltar si no hay archivo de estructura
    
    const item = document.createElement('div');
    item.className = 'structure-item';
    
    // Sección de información
    const infoSection = document.createElement('div');
    infoSection.className = 'structure-info';
    
    // Nombre del servicio
    const nameElement = document.createElement('div');
    nameElement.className = 'structure-name';
    nameElement.textContent = `${structure.service_number || ''} - ${structure.service_name || 'Sin nombre'}`;
    infoSection.appendChild(nameElement);
    
    // Detalles (fecha)
    const detailsElement = document.createElement('div');
    detailsElement.className = 'structure-details';
    detailsElement.textContent = structure.upload_date || '';
    infoSection.appendChild(detailsElement);
    
    item.appendChild(infoSection);
    
    // Sección de acciones
    const actionsSection = document.createElement('div');
    actionsSection.className = 'structure-actions';
    
    // Botón para ver estructura
    const viewBtn = document.createElement('button');
    viewBtn.className = 'action-btn';
    viewBtn.textContent = 'Ver Estructura';
    viewBtn.onclick = () => loadStructure(structure.structure_file);
    actionsSection.appendChild(viewBtn);
    
    item.appendChild(actionsSection);
    
    // Agregar el elemento a la lista
    structuresList.insertBefore(item, noStructuresMessage);
  });
}
