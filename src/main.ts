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
