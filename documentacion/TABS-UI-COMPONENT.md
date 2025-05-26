# Documentación: Componente de Pestañas para Servicios

Este documento describe el componente de interfaz de usuario que proporciona las pestañas de IDA y VUELTA para el envío y recepción de mensajes respectivamente.

## Estructura del Componente

El componente de pestañas ofrece una interfaz de usuario dividida en dos secciones principales:

1. **Pestaña IDA**: Para la generación de mensajes en formato de cadena (sendMessage)
2. **Pestaña VUELTA**: Para la recepción y procesamiento de mensajes (receiveMessage)

## Instalación en HTML

```html
<!-- Estructura de Pestañas de Navegación -->
<div class="services-nav-tabs">
    <button class="services-tab-btn" data-service-tab="ida">IDA (Envío)</button>
    <button class="services-tab-btn" data-service-tab="vuelta">VUELTA (Recepción)</button>
</div>

<!-- Contenido de las Pestañas -->
<div class="services-tab-contents">
    <div id="idaService" class="service-tab-content">
        <!-- Contenido de la pestaña IDA -->
        <div class="service-form-container">
            <!-- Select para elegir servicio -->
            <select id="idaServiceSelect">
                <option value="">Seleccionar servicio...</option>
            </select>
            
            <!-- Contenedor para formulario JSON -->
            <div id="idaJsonEditor"></div>
            
            <!-- Botón para enviar -->
            <button id="idaSubmitBtn" class="action-button">Generar String IDA</button>
            
            <!-- Resultados -->
            <div id="idaResultContainer"></div>
        </div>
    </div>
    
    <div id="vueltaService" class="service-tab-content">
        <!-- Contenido de la pestaña VUELTA -->
        <div class="service-form-container">
            <!-- Select para elegir servicio -->
            <select id="vueltaServiceSelect">
                <option value="">Seleccionar servicio...</option>
