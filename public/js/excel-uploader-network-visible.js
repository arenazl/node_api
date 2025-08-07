/**
 * Cliente JavaScript para subida de Excel con llamadas separadas
 * AMBAS llamadas aparecen en Network del navegador
 */

class ExcelUploaderNetworkVisible {
  constructor() {
    this.nodeApiUrl = window.location.origin;
    this.moraSimApiUrl = 'http://localhost:5000/api/SimImporter'; // Configurar según ambiente
  }

  /**
   * Subir y procesar Excel con llamadas separadas visibles en Network
   */
  async uploadExcelWithVisibleCalls(formData, progressCallback) {
    try {
      // PASO 1: Parsear Excel (node_api) - VISIBLE en Network
      console.log("🔧 PASO 1: Parseando Excel...");
      progressCallback && progressCallback({ step: 1, message: "Parseando estructura Excel..." });

      const parseResponse = await fetch(`${this.nodeApiUrl}/excel/parse-only`, {
        method: 'POST',
        body: formData
      });

      if (!parseResponse.ok) {
        const error = await parseResponse.json();
        throw new Error(error.error || 'Error al parsear Excel');
      }

      const parseResult = await parseResponse.json();
      console.log("✅ PASO 1 completado:", parseResult);

      // PASO 2: Guardar en BD (Mora.Sim-api) - VISIBLE en Network
      console.log("🔧 PASO 2: Guardando en base de datos...");
      progressCallback && progressCallback({ step: 2, message: "Guardando en base de datos..." });

      const storeResponse = await fetch(`${this.moraSimApiUrl}/StoreExcelWithStructure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parseResult.data.forMoraSimApi)
      });

      if (!storeResponse.ok) {
        const error = await storeResponse.json();
        throw new Error(error.error || 'Error al guardar en base de datos');
      }

      const storeResult = await storeResponse.json();
      console.log("✅ PASO 2 completado:", storeResult);

      // RESULTADO FINAL
      progressCallback && progressCallback({ step: 3, message: "¡Proceso completado exitosamente!" });

      return {
        success: true,
        message: "Excel procesado y guardado exitosamente",
        data: {
          parsing: parseResult,
          storage: storeResult,
          summary: {
            serviceNumber: parseResult.data.preview.serviceNumber,
            version: parseResult.data.forMoraSimApi.Version,
            fileName: parseResult.data.preview.fileName,
            excelId: storeResult.data?.ExcelId,
            structureId: storeResult.data?.StructureResult?.StructureId
          }
        },
        networkCalls: [
          {
            step: 1,
            url: `${this.nodeApiUrl}/excel/parse-only`,
            method: 'POST',
            status: parseResponse.status
          },
          {
            step: 2,
            url: `${this.moraSimApiUrl}/StoreExcelWithStructure`,
            method: 'POST',
            status: storeResponse.status
          }
        ]
      };

    } catch (error) {
      console.error("❌ Error en upload con llamadas visibles:", error);
      throw error;
    }
  }

  /**
   * Guardar configuración de servicio (también visible en Network)
   */
  async saveServiceConfiguration(configData, progressCallback) {
    try {
      // PASO 1: Validar datos
      if (!configData.excelId || !configData.serviceNumber) {
        throw new Error('ExcelId y ServiceNumber son requeridos');
      }

      console.log("🔧 Guardando configuración de servicio...");
      progressCallback && progressCallback({ step: 1, message: "Guardando configuración..." });

      // LLAMADA DIRECTA a Mora.Sim-api - VISIBLE en Network
      const response = await fetch(`${this.moraSimApiUrl}/StoreSettingsWithValues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ExcelId: configData.excelId,
          Version: configData.version || '1.0',
          SettingName: configData.settingName || `Config_${configData.serviceNumber}`,
          SettingJson: JSON.stringify(configData.settings || {})
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar configuración');
      }

      const result = await response.json();
      console.log("✅ Configuración guardada:", result);

      progressCallback && progressCallback({ step: 2, message: "¡Configuración guardada exitosamente!" });

      return {
        success: true,
        message: "Configuración guardada exitosamente",
        data: result,
        networkCall: {
          url: `${this.moraSimApiUrl}/StoreSettingsWithValues`,
          method: 'POST',
          status: response.status
        }
      };

    } catch (error) {
      console.error("❌ Error al guardar configuración:", error);
      throw error;
    }
  }

  /**
   * Upload completo: Excel + Configuración en pasos separados
   */
  async uploadCompleteWithSteps(formData, configData, progressCallback) {
    try {
      // PASO 1: Upload Excel
      const uploadResult = await this.uploadExcelWithVisibleCalls(formData, (progress) => {
        progressCallback && progressCallback({
          ...progress,
          step: progress.step,
          totalSteps: 4
        });
      });

      if (!uploadResult.success) {
        throw new Error('Error en upload de Excel');
      }

      // PASO 2: Guardar configuración (usar ExcelId del resultado anterior)
      const configWithExcelId = {
        ...configData,
        excelId: uploadResult.data.summary.excelId
      };

      const configResult = await this.saveServiceConfiguration(configWithExcelId, (progress) => {
        progressCallback && progressCallback({
          ...progress,
          step: progress.step + 2,
          totalSteps: 4
        });
      });

      return {
        success: true,
        message: "Excel y configuración procesados exitosamente",
        data: {
          excel: uploadResult,
          configuration: configResult
        },
        allNetworkCalls: [
          ...uploadResult.networkCalls,
          configResult.networkCall
        ]
      };

    } catch (error) {
      console.error("❌ Error en proceso completo:", error);
      throw error;
    }
  }

  /**
   * Validar Excel sin subir
   */
  async validateExcelOnly(formData) {
    try {
      console.log("🔍 Validando estructura Excel...");

      const response = await fetch(`${this.nodeApiUrl}/excel/validate-structure`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al validar Excel');
      }

      const result = await response.json();
      console.log("✅ Validación completada:", result);

      return result;

    } catch (error) {
      console.error("❌ Error en validación:", error);
      throw error;
    }
  }

  /**
   * Obtener preview de Excel
   */
  async getExcelPreview(formData, maxFields = 10) {
    try {
      console.log("👁️ Obteniendo preview de Excel...");

      // Agregar parámetro maxFields al FormData
      formData.append('maxFields', maxFields.toString());

      const response = await fetch(`${this.nodeApiUrl}/excel/get-preview`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al obtener preview');
      }

      const result = await response.json();
      console.log("✅ Preview obtenido:", result);

      return result;

    } catch (error) {
      console.error("❌ Error en preview:", error);
      throw error;
    }
  }
}

// ==========================================
// FUNCIONES DE USO EN PÁGINAS HTML
// ==========================================

/**
 * Ejemplo de uso en página HTML
 */
function initializeExcelUploaderWithNetworkVisibility() {
  const uploader = new ExcelUploaderNetworkVisible();
  
  // Ejemplo: Form de upload con progress
  const uploadForm = document.getElementById('excelUploadForm');
  const progressDiv = document.getElementById('uploadProgress');
  
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(uploadForm);
      
      try {
        // Progress callback para mostrar en UI
        const result = await uploader.uploadExcelWithVisibleCalls(formData, (progress) => {
          if (progressDiv) {
            progressDiv.innerHTML = `
              <div class="progress-step">
                <strong>Paso ${progress.step}/3:</strong> ${progress.message}
              </div>
            `;
          }
          console.log("📊 Progress:", progress);
        });
        
        // Mostrar resultado exitoso
        if (progressDiv) {
          progressDiv.innerHTML = `
            <div class="success">
              <h4>✅ ¡Éxito!</h4>
              <p>${result.message}</p>
              <div class="network-info">
                <h5>Llamadas en Network:</h5>
                <ul>
                  ${result.networkCalls.map(call => 
                    `<li>${call.method} ${call.url} - Status: ${call.status}</li>`
                  ).join('')}
                </ul>
              </div>
              <div class="summary">
                <h5>Resumen:</h5>
                <ul>
                  <li>Servicio: ${result.data.summary.serviceNumber}</li>
                  <li>Archivo: ${result.data.summary.fileName}</li>
                  <li>Excel ID: ${result.data.summary.excelId}</li>
                  <li>Structure ID: ${result.data.summary.structureId}</li>
                </ul>
              </div>
            </div>
          `;
        }
        
        console.log("🎉 Upload completado:", result);
        
      } catch (error) {
        if (progressDiv) {
          progressDiv.innerHTML = `
            <div class="error">
              <h4>❌ Error</h4>
              <p>${error.message}</p>
            </div>
          `;
        }
        console.error("💥 Error en upload:", error);
      }
    });
  }
}

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', initializeExcelUploaderWithNetworkVisibility);

// Exportar para uso en otros scripts
window.ExcelUploaderNetworkVisible = ExcelUploaderNetworkVisible;