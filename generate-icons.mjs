// Script para generar íconos PNG de la PWA
// Ejecutar con: node generate-icons.mjs

import { writeFileSync } from 'fs';

// Genera un PNG simple con un fondo oscuro y texto "MS"
// Para producción se debería usar una herramienta apropiada
function createMinimalPNG(size) {
  // Crear un BMP simple (más fácil que PNG sin dependencias)
  // Por ahora usamos el SVG como favicon - los PWA icons son opcionales para dev
  console.log(`Para generar íconos de ${size}x${size}, usa:`);
  console.log(`  npx sharp-cli resize ${size} ${size} -i public/icon.svg -o public/icon-${size}.png`);
}

createMinimalPNG(192);
createMinimalPNG(512);

console.log('\nAlternativa: Usá https://realfavicongenerator.net/ con el icon.svg');
