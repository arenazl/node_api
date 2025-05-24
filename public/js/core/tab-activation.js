/**
 * Tab Activation Helper
 * Manages proper tab activation and ensures content is displayed correctly
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[TabActivation] Initializing tab activation helper...');
    
    // Attach event listeners to subtabs
    attachSubtabListeners();

    // Listen for file upload events to trigger proper tab activation
    window.addEventListener('fileUploaded', function(e) {
        console.log('[TabActivation] File uploaded event detected, activating tabs...');
        setTimeout(activateTabsForStructure, 300);
    });

    // Also listen for events using the EventBus if available
    if (window.EventBus && window.AppEvents) {
        window.EventBus.subscribe(window.AppEvents.FILE_UPLOADED, function(data) {
            console.log('[TabActivation] FILE_UPLOADED event detected via EventBus');
            setTimeout(activateTabsForStructure, 300);
        });
    }
});

/**
 * Attach event listeners to all subtabs to log activation
 */
function attachSubtabListeners() {
    const subtabBtns = document.querySelectorAll('.subtab-btn');
    
    subtabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const subtabId = this.getAttribute('data-subtab');
            console.log(`[TabActivation] User clicked subtab: ${subtabId}`);
            
            // Force the tab pane to be visible
            const targetPane = document.getElementById(`subtab-${subtabId}`);
            if (targetPane) {
                // Clear any previous style that might be hiding it
                targetPane.style.display = 'block';
                
                // Add active class 
                targetPane.classList.add('active');
                
                // Remove active class from other tab panes
                document.querySelectorAll('.subtab-pane').forEach(pane => {
                    if (pane !== targetPane) {
                        pane.classList.remove('active');
                    }
                });

                // Debug state
                console.log(`[TabActivation] Subtab ${subtabId} activated: 
                    classList=${targetPane.className}, 
                    display=${window.getComputedStyle(targetPane).display}, 
                    visibility=${window.getComputedStyle(targetPane).visibility}`);
            }
        });
    });
}

/**
 * Activate all tabs in sequence to ensure content is displayed
 */
function activateTabsForStructure() {
    // First activate the main tab 'carga'
    const cargaTab = document.querySelector('.main-tab-btn[data-tab="carga"]');
    if (cargaTab) {
        cargaTab.click();
        console.log('[TabActivation] Carga tab clicked');
        
        // Sequence through the subtabs with short delays to ensure DOM updates
        setTimeout(() => {
            const cabeceraTab = document.querySelector('.subtab-btn[data-subtab="cabecera"]');
            if (cabeceraTab) {
                cabeceraTab.click();
                console.log('[TabActivation] Cabecera subtab clicked');
                
                // Then activate other tabs sequentially with delays
                setTimeout(() => {
                    const requerimientoTab = document.querySelector('.subtab-btn[data-subtab="requerimiento"]');
                    if (requerimientoTab) {
                        requerimientoTab.click();
                        console.log('[TabActivation] Requerimiento subtab clicked');
                        
                        // Check request table content
                        const requestTable = document.getElementById('requestTable');
                        if (requestTable) {
                            const tableHTML = requestTable.innerHTML;
                            const hasEmptyMessage = tableHTML.includes('Seleccione un archivo Excel');
                            console.log(`[TabActivation] Request table has empty message: ${hasEmptyMessage}`);
                            
                            if (hasEmptyMessage) {
                                console.warn('[TabActivation] Requerimiento table still shows empty message after activation!');
                                
                                // Force reload structure if available
                                if (window.currentStructure && window.currentStructure.service_structure) {
                                    console.log('[TabActivation] Forcing structure display from cached data');
                                    if (typeof displayServiceStructure === 'function') {
                                        displayServiceStructure(window.currentStructure.service_structure);
                                    }
                                }
                            }
                        }
                        
                        setTimeout(() => {
                            const respuestaTab = document.querySelector('.subtab-btn[data-subtab="respuesta"]');
                            if (respuestaTab) {
                                respuestaTab.click();
                                console.log('[TabActivation] Respuesta subtab clicked');
                                
                                setTimeout(() => {
                                    const jsonTab = document.querySelector('.subtab-btn[data-subtab="json"]');
                                    if (jsonTab) {
                                        jsonTab.click();
                                        console.log('[TabActivation] JSON subtab clicked');
                                        
                                        // Return to requerimiento tab for final view
                                        setTimeout(() => {
                                            if (requerimientoTab) {
                                                requerimientoTab.click();
                                                console.log('[TabActivation] Back to requerimiento subtab');
                                            }
                                        }, 100);
                                    }
                                }, 100);
                            }
                        }, 100);
                    }
                }, 100);
            }
        }, 100);
    }
}

// Add direct structure reload function
function forceStructureDisplay() {
  console.log('[TabActivation] Attempting to force structure display');
  
  if (window.currentStructure && window.currentStructure.service_structure) {
    console.log('[TabActivation] Found cached structure data, forcing display');
    
    // First get references to the tables
    const requestTableBody = document.getElementById('requestTable')?.querySelector('tbody');
    const responseTableBody = document.getElementById('responseTable')?.querySelector('tbody');
    
    if (requestTableBody && responseTableBody) {
      console.log('[TabActivation] Table references found, clearing current content');
      
      // Clear current content
      requestTableBody.innerHTML = '';
      responseTableBody.innerHTML = '';
      
      try {
        // Get reference to the display function
        if (typeof displayServiceSection === 'function') {
          console.log('[TabActivation] Using displayServiceSection for request data');
          // Display request structure
          if (window.currentStructure.service_structure.request) {
            displayServiceSection(window.currentStructure.service_structure.request, requestTableBody.parentElement);
          }
          
          // Display response structure
          if (window.currentStructure.service_structure.response) {
            displayServiceSection(window.currentStructure.service_structure.response, responseTableBody.parentElement);
          }
        } else {
          console.warn('[TabActivation] displayServiceSection function not found');
        }
      } catch (err) {
        console.error('[TabActivation] Error forcing structure display:', err);
      }
    } else {
      console.warn('[TabActivation] Could not find table references');
    }
  } else {
    console.warn('[TabActivation] No structure data available to display');
  }
}

// Listen for tab click to force refresh when switching to requerimiento
document.addEventListener('DOMContentLoaded', function() {
  const reqTab = document.querySelector('.subtab-btn[data-subtab="requerimiento"]');
  if (reqTab) {
    reqTab.addEventListener('click', function() {
      setTimeout(forceStructureDisplay, 50);
    });
  }
});

// Expose globally for manual triggering if needed
window.forceTabActivation = activateTabsForStructure;
window.forceStructureDisplay = forceStructureDisplay;
