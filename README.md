# NextMoments · prototipo de aplicación

Prototipo mobile-first para TecnoChallenge, reconstruido a partir de `captura1.png`, `captura2.png` y `captura3.png`. Usa el logo y wordmark oficiales de la carpeta raíz, la paleta del proyecto y PT Serif + Inter.

## Ejecutar

Abre `app/index.html` o inicia Live Server desde esta carpeta. No requiere dependencias ni compilación.

## Recorrido

- Bienvenida con acceso y registro de demostración.
- Swipe/Limpieza con X roja para descartar y ✓ verde para conservar, gestos laterales, animación y estado guardado en `localStorage`.
- Álbumes con filtros, búsqueda, creación de colecciones y vista de detalle.
- Tienda con álbum de fotos y álbum con NFC al inicio, seguida de los productos existentes, cesta de demostración y puntos.
- Perfil con favoritos, métricas ilustrativas, ajustes y reinicio de datos.
- Resumen de una sesión de limpieza.

Los álbumes, el álbum NFC y las copias Polaroid tienen fotografía de producto local. El resto de imágenes de muestra se carga desde Unsplash. El análisis, la limpieza, la integración NFC, los puntos, el acceso y las compras son simulaciones: no se borran fotos ni se procesan pagos. El precio del álbum NFC está por definir. Las fotos añadidas desde el equipo se usan localmente durante la sesión.
