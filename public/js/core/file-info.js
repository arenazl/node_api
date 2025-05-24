/**
 * Script para gestionar la información del archivo actual
 */

document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const fileInfoContainer = document.getElementById('current-file-info');
  const currentFileName = document.getElementById('currentFileName');
  const currentFileService = document.getElementById('currentFileService');

  // Verificar si tenemos información guardada en localStorage
  const savedFileName = localStorage.getItem('currentFileName');
  const savedFileService = localStorage.getItem('currentFileService');
  const shouldBeVisible = localStorage.getItem('fileInfoVisible') === 'true';

  // Si tenemos información guardada y debería ser visible, mostrarla
  if (fileInfoContainer && currentFileName && currentFileService && 
      savedFileName && savedFileService && shouldBeVisible) {
    
    // Establecer la información guardada
    currentFileName.textContent = savedFileName;
    currentFileService.textContent = savedFileService;
    
    // Mostrar el contenedor con la animación
    fileInfoContainer.style.display = 'block';
    
    // Usar setTimeout para asegurar que la transición se active
    setTimeout(() => {
      fileInfoContainer.classList.add('show');
    }, 10);
  }

  // Crear un método global para actualizar la información del archivo
  window.updateFileInfo = function(fileName, serviceNumber, serviceName) {
    if (fileInfoContainer && currentFileName && currentFileService) {
      // Actualizar la información
      currentFileName.textContent = fileName || 'Archivo sin nombre';
      
      if (serviceNumber && serviceName) {
        currentFileService.textContent = `Servicio ${serviceNumber} - ${serviceName}`;
      } else if (serviceNumber) {
        currentFileService.textContent = `Servicio ${serviceNumber}`;
      } else {
        currentFileService.textContent = 'Servicio no identificado';
      }
      
      // Mostrar el contenedor con animación
      fileInfoContainer.style.display = 'block';
      
      // Usar setTimeout para asegurar que la transición se active
      setTimeout(() => {
        fileInfoContainer.classList.add('show');
      }, 10);
      
      // Guardar en localStorage
      try {
        localStorage.setItem('currentFileName', currentFileName.textContent);
        localStorage.setItem('currentFileService', currentFileService.textContent);
        localStorage.setItem('fileInfoVisible', 'true');
      } catch (e) {
        console.warn('No se pudo guardar información en localStorage:', e);
      }
    }
  };

  // Escuchar eventos de carga de archivo
  window.addEventListener('fileUploaded', function(e) {
    if (e.detail) {
      updateFileInfo(
        e.detail.fileName, 
        e.detail.serviceNumber, 
        e.detail.serviceName
      );
    }
  });

  // También escuchar eventos del EventBus si está disponible
  if (window.EventBus && window.AppEvents) {
    window.EventBus.subscribe(window.AppEvents.FILE_UPLOADED, function(data) {
      if (data) {
        updateFileInfo(
          data.file_name || data.fileName, 
          data.service_number, 
          data.service_name
        );
      }
    });
  }
});
