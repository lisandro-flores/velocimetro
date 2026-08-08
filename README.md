# MotoSpeed 🏍️💨

**MotoSpeed** es una aplicación Web Progresiva (PWA) de velocímetro y registro de viajes diseñada específicamente para motociclistas. Destaca por tener una estética premium, estar construida bajo la premisa de ser "Offline-First", y no requerir conexión a internet en carretera.

## 🌟 Características Principales

- **Velocímetro de Precisión:** Con estabilización de GPS (mediante Suavizado Exponencial - EMA) e ignorando señales débiles para mostrar mediciones exactas y estables.
- **Registro de Viajes (Trip Tracking):** Calcula distancia, tiempo, altitud, velocidad máxima y velocidad promedio.
- **Historial Offline:** Todo se guarda en tu dispositivo utilizando IndexedDB (`Dexie.js`). Tu privacidad y datos están seguros y no dependen de cobertura celular.
- **Brújula Magnética:** Integración de `deviceorientationabsolute` para un norte real fluido en dispositivos móviles.
- **Pantalla Siempre Activa:** Implementa la *Screen Wake Lock API* para mantener la pantalla de tu dispositivo encendida durante todo el viaje.
- **Alertas Personalizables:** Notificaciones visuales, acústicas y de vibración si superas el límite de velocidad establecido.
- **Instalación Nativa (PWA):** Instálala desde tu navegador (Chrome/Safari) como cualquier otra aplicación nativa.

## 🛠️ Tecnologías (Stack)

- **Frontend:** [Vite](https://vitejs.dev/) + [Vanilla TypeScript](https://www.typescriptlang.org/)
- **Estilos:** CSS Puro (Custom Properties, animaciones optimizadas para GPU)
- **Almacenamiento:** [Dexie.js](https://dexie.org/) (Wrapper moderno para IndexedDB) + LocalStorage.
- **PWA:** `vite-plugin-pwa` con Service Workers optimizados para caché y funcionamiento offline.

## 🚀 Instalación Local (Desarrollo)

Asegúrate de tener instalado [Node.js](https://nodejs.org/) (v18 o superior).

1. Clona el repositorio:
   ```bash
   git clone https://github.com/lisandro-flores/velocimetro.git
   cd velocimetro
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

*Nota para pruebas:* Muchas APIs (como Geolocation, WakeLock y Service Workers) exigen un contexto seguro (`HTTPS`) o ser ejecutadas localmente desde `localhost`.

## 🚢 Despliegue en Producción (Coolify / Docker)

El proyecto incluye un `Dockerfile` multi-etapa y una configuración de `nginx.conf` completamente ajustada para proveer caché largo (1 año) a archivos estáticos y `no-cache` al manifiesto y el Service Worker.

**Despliegue rápido en Coolify v4:**
1. Crea un nuevo recurso **Public Repository** en Coolify.
2. Ingresa la URL del repositorio y selecciona la rama `main`.
3. Selecciona **Dockerfile** como Build Pack.
4. Establece tu dominio (ej. `https://velocimetro.ngicode.com/`) asegurándote de usar **HTTPS**.
5. Asegúrate de que el **Port Exposes** esté configurado al puerto **`80`**.
6. Haz clic en **Deploy**.

## 📱 Transformar en APK Nativa (Opcional - Capacitor)

Si deseas empaquetar MotoSpeed como un archivo APK/App Bundle y conseguir beneficios como seguimiento GPS en background con el teléfono bloqueado:

1. Ejecuta: `npm run build`
2. Sincroniza Capacitor: `npx cap sync android`
3. Abre Android Studio: `npx cap open android`
4. Desde el menú de Android Studio genera tu APK en **Build > Build Bundle(s) / APK(s)**.

---
*Diseñado con el motociclismo y las rutas sin cobertura celular en mente.*
