# Roadmap de Desarrollo (MotoSpeed) 🗺️🏍️

Este documento contiene las ideas y características planificadas para el futuro desarrollo de la aplicación, priorizando el uso de las tecnologías nativas del dispositivo móvil (Offline-First) antes de depender de infraestructuras en la nube.

## 🌟 Funcionalidades Prioritarias

### 1. 📍 Registro de Ruta (Exportación GPX)
**Objetivo:** Permitir a los usuarios visualizar el recorrido exacto de su viaje en mapas externos (Strava, Google Earth, etc.).
- **Técnica:** Modificar el `TripService` para almacenar un array de coordenadas (`lat`, `lng`, `alt`, `time`) usando `IndexedDB` a medida que avanza el viaje.
- **Salida:** Un botón de "Descargar Ruta" al finalizar un viaje que genere dinámicamente un archivo `.gpx` y permita su descarga local.
- **Paso hacia la Nube:** Esta funcionalidad es el cimiento necesario para, en un futuro, subir estas rutas a una base de datos propia y dibujarlas en un componente de mapa integrado.

### 2. 📸 Dashcam Dual (Cámara Frontal y Trasera)
**Objetivo:** Utilizar el teléfono celular como una cámara de seguridad para motos (Dashcam), grabando de forma continua en bucle.
- **Técnica:** Acceder a la `MediaDevices API` (`getUserMedia`).
- **Grabación Dual:** En dispositivos modernos, solicitar streams de video concurrentes de las cámaras `user` (frontal) y `environment` (trasera). *(Nota técnica: No todos los móviles soportan streams simultáneos de dos cámaras a nivel de hardware, por lo que requerirá un chequeo de compatibilidad (`enumerateDevices`) y un fallback a cámara única).*
- **Almacenamiento en Bucle:** Usar `MediaRecorder` para grabar clips (ej. 5 minutos) en la memoria temporal (blobs). 
- **Auto-Guardado Inteligente:** Integrar con la telemetría (G-Force). Si se detecta una frenada de emergencia extrema o impacto (pico G alto), la app guarda automáticamente el último clip en la galería del usuario.

## 🛠️ Otras Ideas Locales

### 3. 📳 Haptic Feedback Avanzado
Mejorar la comunicación con el piloto usando la `Vibration API`.
- Patrones agresivos al exceder la velocidad límite.
- Patrones cortos/pulsantes al inclinarse demasiado (Lean Angle Warning).

### 4. 🎤 Control por Voz (Manos libres)
Usar `SpeechRecognition` para controlar el dashboard sin quitarse los guantes.
- "Iniciar viaje", "Pausar", "Pantalla completa".

### 5. 🌙 Cambio de Tema Basado en Sol (SunCalc)
Cambiar a modo oscuro dinámicamente utilizando el GPS para calcular la hora de amanecer y atardecer local (o usando la `Ambient Light Sensor API`), evitando deslumbramientos nocturnos.
