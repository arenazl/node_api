#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Cliente de ejemplo para consumir la API MQ Importer desde Python

Este script muestra cómo conectarse y consumir los servicios 
de la API desde una aplicación Python externa.
"""

import requests
import json
from typing import Dict, List, Any, Optional
from datetime import datetime

# URL base de la API (modificar según la configuración de su entorno)
API_BASE_URL = "http://localhost:3000"

# Tiempo de espera para las solicitudes en segundos
TIMEOUT = 10


class MQImporterClient:
    """Cliente para consumir la API MQ Importer"""

    def __init__(self, base_url: str = API_BASE_URL, timeout: int = TIMEOUT):
        """
        Inicializa el cliente con la URL base y timeout
        
        Args:
            base_url: URL base de la API
            timeout: Timeout para las solicitudes en segundos
        """
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def obtener_servicios(self) -> List[Dict[str, Any]]:
        """
        Obtiene la lista de servicios disponibles
        
        Returns:
            Lista de servicios
        
        Raises:
            Exception: Si hay un error en la solicitud
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/services",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json().get("services", [])
        except requests.exceptions.RequestException as e:
            print(f"Error al obtener servicios: {str(e)}")
            raise

    def obtener_servicio(self, numero_servicio: str) -> Dict[str, Any]:
        """
        Obtiene la información de un servicio específico
        
        Args:
            numero_servicio: Número del servicio a consultar
            
        Returns:
            Información del servicio
            
        Raises:
            Exception: Si hay un error en la solicitud
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/services/{numero_servicio}",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al obtener servicio {numero_servicio}: {str(e)}")
            raise

    def procesar_servicio(self, numero_servicio: str, stream: Optional[str] = None) -> Dict[str, Any]:
        """
        Procesa un servicio con un stream de datos opcional
        
        Args:
            numero_servicio: Número del servicio a procesar
            stream: Stream de datos para procesar (opcional)
            
        Returns:
            Resultado del procesamiento
            
        Raises:
            Exception: Si hay un error en la solicitud
        """
        try:
            payload = {"service_number": numero_servicio}
            if stream:
                payload["stream"] = stream
                
            response = self.session.post(
                f"{self.base_url}/api/services/process",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al procesar servicio {numero_servicio}: {str(e)}")
            raise

    def verificar_estado(self) -> Dict[str, Any]:
        """
        Verifica el estado de salud de la API
        
        Returns:
            Estado del sistema
            
        Raises:
            Exception: Si hay un error en la solicitud
        """
        try:
            response = self.session.get(
                f"{self.base_url}/health",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error al verificar estado: {str(e)}")
            raise


# Ejemplos de uso
def ejemplo_obtener_servicios():
    """Ejemplo de obtención de todos los servicios"""
    cliente = MQImporterClient()
    try:
        servicios = cliente.obtener_servicios()
        print("Servicios disponibles:")
        for servicio in servicios:
            numero = servicio.get("service_number", "N/A")
            nombre = servicio.get("service_name", "Sin nombre")
            tipo = servicio.get("type", "N/A")
            print(f"  - {numero}: {nombre} ({tipo})")
        print(f"Total: {len(servicios)} servicios")
    except Exception:
        print("No se pudo completar la operación")


def ejemplo_obtener_servicio_especifico(numero_servicio):
    """Ejemplo de obtención de un servicio específico"""
    cliente = MQImporterClient()
    try:
        servicio = cliente.obtener_servicio(numero_servicio)
        print(f"Información del servicio {numero_servicio}:")
        print(json.dumps(servicio, indent=2, ensure_ascii=False))
    except Exception:
        print("No se pudo completar la operación")


def ejemplo_procesar_servicio(numero_servicio, stream):
    """Ejemplo de procesamiento de un servicio con datos"""
    cliente = MQImporterClient()
    try:
        resultado = cliente.procesar_servicio(numero_servicio, stream)
        print(f"Resultado del procesamiento del servicio {numero_servicio}:")
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    except Exception:
        print("No se pudo completar la operación")


def ejemplo_verificar_estado():
    """Ejemplo de verificación del estado del sistema"""
    cliente = MQImporterClient()
    try:
        estado = cliente.verificar_estado()
        print("Estado del sistema:")
        print(f"  - Estado: {estado.get('status')}")
        print(f"  - Entorno: {estado.get('environment', {}).get('nodeEnv')}")
        
        # Convertir tiempo activo de segundos a formato más legible
        uptime = estado.get('uptime', 0)
        minutos = int(uptime / 60)
        horas = int(minutos / 60)
        dias = int(horas / 24)
        
        if dias > 0:
            tiempo_activo = f"{dias}d {horas % 24}h {minutos % 60}m"
        elif horas > 0:
            tiempo_activo = f"{horas}h {minutos % 60}m"
        else:
            tiempo_activo = f"{minutos}m"
            
        print(f"  - Tiempo activo: {tiempo_activo}")
        print(f"  - Memoria usada: {estado.get('memory', {}).get('heapUsed')}")
        
        # Mostrar última actualización de caché
        cache = estado.get('cache', {})
        last_update = cache.get('lastUpdate')
        if last_update:
            # Convertir timestamp a formato legible
            fecha = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
            print(f"  - Última actualización de caché: {fecha.strftime('%Y-%m-%d %H:%M:%S')}")
            
        print(f"  - Servicios en caché: {cache.get('services', 0)}")
        print(f"  - Estructuras en caché: {cache.get('structures', 0)}")
    except Exception:
        print("No se pudo completar la operación")


if __name__ == "__main__":
    # Descomentar según necesidad
    # ejemplo_obtener_servicios()
    # ejemplo_obtener_servicio_especifico("3088")
    # ejemplo_procesar_servicio("3088", "STREAMDEDATOS...")
    # ejemplo_verificar_estado()
    
    print("Cliente API MQ Importer")
    print("Ejemplos de integración con Python")
    print("\nDescomentar los ejemplos en el código para ejecutarlos")
