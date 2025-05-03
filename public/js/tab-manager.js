/**
 * Script para gestionar la visibilidad de pestañas y paneles específicos
 */

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos DOM para pestañas principales
  const mainTabButtons = document.querySelectorAll('.main-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Referencias a elementos DOM para subpestañas
  const subtabButtons = document.querySelectorAll('.subtab-btn');
  const subtabPanes = document.querySelectorAll('.subtab-pane');
  
  // Panel de estructuras
  const structuresPanel = document.getElementById('structuresPanel');
  
  // Función para manejar la navegación de pestañas principales
  function handleMainTabClick(event) {
    // Obtener el atributo data-tab del botón clickeado
    const tabName = event.target.getAttribute('data-tab');
    
    if (!tabName) return;
    
    // Desactivar todas las pestañas y activar la seleccionada
    mainTabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar el contenido de la pestaña seleccionada
    tabPanes.forEach(pane => {
      if (pane.id === tabName) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    // Actualizar visibilidad del panel de estructuras
    updateStructuresPanelVisibility();
  }
  
  // Función para manejar la navegación de subpestañas
  function handleSubtabClick(event) {
    // Obtener el atributo data-subtab del botón clickeado
    const subtabName = event.target.getAttribute('data-subtab');
    
    if (!subtabName) return;
    
    // Desactivar todas las subpestañas y activar la seleccionada
    subtabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar el contenido de la subpestaña seleccionada
    subtabPanes.forEach(pane => {
      if (pane.id === 'subtab-' + subtabName) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    // Actualizar visibilidad del panel de estructuras para la subpestaña JSON
    if (subtabName === 'json') {
      if (structuresPanel) {
        structuresPanel.style.display = 'block';
      }
    } else {
      if (structuresPanel) {
        structuresPanel.style.display = 'none';
      }
    }
  }
  
  // Función para mostrar/ocultar el panel de estructuras
  function updateStructuresPanelVisibility() {
    // Comprobar si la pestaña carga está activa
    const cargaTabActive = document.getElementById('carga').classList.contains('active');
    
    if (cargaTabActive) {
      // Comprobar si la subpestaña JSON está activa
      const jsonSubtabActive = document.getElementById('subtab-json')?.classList.contains('active');
      
      if (structuresPanel) {
        if (jsonSubtabActive) {
          structuresPanel.style.display = 'block';
        } else {
          structuresPanel.style.display = 'none';
        }
      }
    } else {
      // Si la pestaña carga no está activa, ocultar el panel de estructuras
      if (structuresPanel) {
        structuresPanel.style.display = 'none';
      }
    }
  }
  
  // Configurar los eventos de clic para todas las pestañas principales
  mainTabButtons.forEach(button => {
    button.addEventListener('click', handleMainTabClick);
  });
  
  // Configurar los eventos de clic para todas las subpestañas
  subtabButtons.forEach(button => {
    button.addEventListener('click', handleSubtabClick);
  });
  
  // Inicializar la visibilidad del panel de estructuras al cargar la página
  updateStructuresPanelVisibility();
  
  // Exportar funciones para uso desde otros scripts
  window.tabManager = {
    activateTab: function(tabName) {
      const tabButton = document.querySelector(`.main-tab-btn[data-tab="${tabName}"]`);
      if (tabButton) {
        tabButton.click();
        return true;
      }
      return false;
    },
    
    activateSubtab: function(subtabName) {
      const subtabButton = document.querySelector(`.subtab-btn[data-subtab="${subtabName}"]`);
      if (subtabButton) {
        subtabButton.click();
        return true;
      }
      return false;
    }
  };
});
