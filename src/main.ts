import './style.css';
import { App } from './app';

/**
 * Entry point de MotoSpeed.
 * Inicializa la app cuando el DOM está listo.
 */
const app = new App();
app.init();

// Cleanup al cerrar
window.addEventListener('beforeunload', () => {
  app.destroy();
});

// PWA Install Prompt Logic
let deferredPrompt: any;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const closeBtn = document.getElementById('install-close-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  // Evitar que Chrome muestre el mini-infobar automático
  e.preventDefault();
  // Guardar el evento para dispararlo más tarde
  deferredPrompt = e;
  // Mostrar la UI de instalación
  if (installBanner) {
    installBanner.style.display = 'flex';
  }
});

if (installBtn && installBanner) {
  installBtn.addEventListener('click', async () => {
    // Ocultar banner
    installBanner.style.display = 'none';
    if (!deferredPrompt) return;
    // Mostrar el prompt nativo
    deferredPrompt.prompt();
    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Limpiar la variable
    deferredPrompt = null;
  });
}

if (closeBtn && installBanner) {
  closeBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
  });
}
