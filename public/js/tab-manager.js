/**
 * Script para gestionar la visibilidad de pestañas y paneles específicos
 */

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos DOM
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const structuresPanel = document.getElementById('structuresPanel');
  
  // Función para mostrar/ocultar el panel de estructuras
  function updateStructuresPanelVisibility() {
    const jsonTabActive = document.getElementById('json').classList.contains('active');
    
    // Mostrar/ocultar el panel de estructuras según si la pestaña JSON está activa
    if (structuresPanel) {
      if (jsonTabActive) {
        structuresPanel.style.display = 'block';
      } else {
        structuresPanel.style.display = 'none';
      }
    }
  }
  
  // Configurar los eventos de clic para todas las pestañas
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Actualizar la visibilidad del panel de estructuras después de cada cambio de pestaña
      setTimeout(updateStructuresPanelVisibility, 10);
    });
  });
  
  // Inicializar la visibilidad del panel de estructuras al cargar la página
  updateStructuresPanelVisibility();
});
