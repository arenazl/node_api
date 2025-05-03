/**
 * Sistema inteligente para aplicar automáticamente el estilo MacOS a cualquier elemento con scroll
 * Esta implementación detecta automáticamente elementos con scroll y les aplica el estilo personalizado
 */

document.addEventListener('DOMContentLoaded', () => {
  // Definimos el estilo para scrollbars MacOS en un string
  const macOsScrollbarStyle = `
    .mac-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    .mac-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      margin: 3px;
    }
    
    .mac-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0);
      border-radius: 10px;
      transition: background-color 0.3s;
    }
    
    .mac-scrollbar:hover::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
    }
    
    .mac-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.4);
    }
    
    .mac-scrollbar::-webkit-scrollbar-corner {
      background: transparent;
    }
    
    /* Firefox */
    .mac-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
    }
    
    .mac-scrollbar:hover {
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }
  `;
  
  // Aplicar este estilo dinámicamente
  const styleElement = document.createElement('style');
  styleElement.textContent = macOsScrollbarStyle;
  document.head.appendChild(styleElement);
  
  // Función que detecta y aplica el estilo a elementos con scroll
  function applyMacScrollbar() {
    console.log('Aplicando scrollbar estilo MacOS a elementos con scroll');
    
    // Lista de selectores que queremos incluir automáticamente
    const selectors = [
      // Contenedores específicos
      '.config-container', '.table-container', '.json-container', 
      '.files-container', '.result-container', '.json-input-container', 
      '.structures-list', '.field-value-container',
      
      // Elementos con overflow auto
      '[style*="overflow: auto"]', '[style*="overflow:auto"]',
      '[style*="overflow-y: auto"]', '[style*="overflow-y:auto"]',
      '[style*="overflow-x: auto"]', '[style*="overflow-x:auto"]',
      
      // Elementos con clase auto-hide-scrollbar (de estilos existentes)
      '.auto-hide-scrollbar',
      
      // Elementos específicos por ID
      '#streamData', '#fixedStringOutput', '#idaJsonInput', '#vueltaResult'
    ];
    
    // Seleccionamos todos los elementos que coincidan con nuestros selectores
    document.querySelectorAll(selectors.join(', ')).forEach(el => {
      el.classList.add('mac-scrollbar');
      // Verificamos que tenga overflow adecuado para el scroll
      const computedStyle = window.getComputedStyle(el);
      const overflow = computedStyle.getPropertyValue('overflow');
      const overflowY = computedStyle.getPropertyValue('overflow-y');
      const overflowX = computedStyle.getPropertyValue('overflow-x');
      
      // Solo aplicamos si no tiene ya definido un overflow que permita scroll
      if (overflow !== 'auto' && overflow !== 'scroll' && 
          overflowY !== 'auto' && overflowY !== 'scroll' &&
          overflowX !== 'auto' && overflowX !== 'scroll') {
        el.style.overflow = 'auto';
      }
    });
    
    // Remover cualquier atributo SimpleBar que pueda interferir
    document.querySelectorAll('[data-simplebar]').forEach(el => {
      el.removeAttribute('data-simplebar');
      el.classList.add('mac-scrollbar');
    });
  }
  
  // Aplicamos inicialmente
  applyMacScrollbar();
  
  // También aplicamos cuando el contenido cambia (por ejemplo, cargar nuevo contenido)
  // Usar MutationObserver para detectar cambios en el DOM
  const observer = new MutationObserver((mutations) => {
    let shouldApply = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldApply = true;
      }
    });
    
    if (shouldApply) {
      applyMacScrollbar();
    }
  });
  
  // Observamos cambios en todo el body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
