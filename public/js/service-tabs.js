/**
 * Script para manejar las pestañas de servicios (ida/vuelta)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar los botones de tabs para Servicio de Ida / Servicio de Vuelta
  const serviceTabBtns = document.querySelectorAll('.services-tab-btn');
  const serviceTabContents = document.querySelectorAll('.service-tab-content');
  
  serviceTabBtns.forEach(button => {
    button.addEventListener('click', () => {
      // Desactivar todas las pestañas de servicios
      serviceTabBtns.forEach(btn => btn.classList.remove('active'));
      serviceTabContents.forEach(content => content.classList.remove('active'));
      
      // Activar la pestaña seleccionada
      button.classList.add('active');
      const tabId = button.getAttribute('data-service-tab');
      document.getElementById(tabId + 'Service').classList.add('active');
    });
  });
  
  // Inicializar eventos para los botones de procesar servicios
  const processIdaBtn = document.getElementById('processIdaBtn');
  if (processIdaBtn) {
    processIdaBtn.addEventListener('click', processIdaService);
  }
  
  const processVueltaBtn = document.getElementById('processVueltaBtn');
  if (processVueltaBtn) {
    processVueltaBtn.addEventListener('click', processVueltaService);
  }
});

/**
 * Procesa un servicio de ida
 */
function processIdaService() {
  const select = document.getElementById('idaServiceSelect');
  const jsonInput = document.getElementById('idaJsonInput');
  const resultContainer = document.getElementById('idaResult');
  
  if (!select || !jsonInput || !resultContainer) return;
  
  // Obtener el valor seleccionado
  const serviceNumber = select.value;
  
  if (!serviceNumber) {
    showNotification('Por favor, seleccione un servicio', 'error');
    return;
  }
  
  // Obtener el texto del JSON
  let jsonData = jsonInput.textContent;
  
  try {
    // Parsear el JSON para validarlo
    const parsedData = JSON.parse(jsonData);
    
    // Enviar petición para procesar el servicio de ida
    fetch(`/api/services/${serviceNumber}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        CANAL: "API",
        SERVICIO: serviceNumber,
        USUARIO: "SISTEMA",
        data: parsedData
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al procesar el servicio');
      }
      return response.json();
    })
    .then(data => {
      // Mostrar el resultado en formato JSON
      resultContainer.textContent = JSON.stringify(data, null, 2);
      showNotification('Servicio de Ida procesado correctamente', 'success');
    })
    .catch(error => {
      resultContainer.textContent = `Error: ${error.message}`;
      showNotification(error.message, 'error');
    });
    
  } catch (error) {
    resultContainer.textContent = `Error al parsear JSON: ${error.message}`;
    showNotification('El JSON ingresado no es válido', 'error');
  }
}

/**
 * Procesa un servicio de vuelta
 */
function processVueltaService() {
  const select = document.getElementById('vueltaServiceSelect');
  const streamInput = document.getElementById('streamData');
  const resultContainer = document.getElementById('vueltaResult');
  
  if (!select || !streamInput || !resultContainer) return;
  
  // Obtener el valor seleccionado
  const serviceNumber = select.value;
  
  if (!serviceNumber) {
    showNotification('Por favor, seleccione un servicio', 'error');
    return;
  }
  
  // Obtener el texto del stream
  const stream = streamInput.value;
  
  if (!stream) {
    showNotification('Por favor, ingrese datos del stream', 'error');
    return;
  }
  
  // Enviar petición para procesar el servicio de vuelta
  fetch('/api/services/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_number: serviceNumber,
      stream: stream
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al procesar el servicio');
    }
    return response.text();
  })
  .then(data => {
    // Mostrar el resultado
    resultContainer.textContent = data;
    showNotification('Servicio de Vuelta procesado correctamente', 'success');
  })
  .catch(error => {
    resultContainer.textContent = `Error: ${error.message}`;
    showNotification(error.message, 'error');
  });
}

/**
 * Muestra una notificación
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success' o 'error')
 */
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = 'notification';
  notification.classList.add(type);
  
  // Mostrar la notificación
  notification.style.display = 'block';
  
  // Ocultar la notificación después de 5 segundos
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}
