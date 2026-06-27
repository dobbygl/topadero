# Créditos y licencias — Topadero

Créditos y licencias de los assets de audio y arte que se publican en el build (008 · FR-019). Las
licencias comerciales DEBEN estar verificadas antes de publicar; los puntos marcados con ⚠ requieren
confirmación del propietario.

## Audio

### Efectos de sonido (SFX)

`jump`, `land`, `hit`, `respawn`: generados con **ElevenLabs** (text-to-sound-effects), cuenta de
pago (Starter o superior), con **licencia de uso comercial**. Reproducibles con `scripts/gen-sfx.ts`
(lee `ELEVENLABS_API_KEY` de `.env`; la clave nunca entra en el build). Archivos:
`public/audio/sfx_{jump,land,hit,respawn}.{ogg,mp3}`.

`finish` (meta): **Kenney — Music Jingles** (`jingles_STEEL07`), **CC0**
(https://kenney.nl/assets/music-jingles). Archivo: `public/audio/sfx_finish.{ogg,mp3}`. No se
regenera con `gen-sfx.ts`.

### Música

`public/audio/music_gameplay.{ogg,mp3}`: generada con **ElevenLabs Music** (cuenta de pago Starter),
con licencia de uso comercial asumida por el proyecto. Loop instrumental de ~40 s, reproducido con
crossfade en el `AudioManager` para empalmar sin corte (FR-004). Reemplazable por un loop CC0
(p. ej. OpenGameArt filtrado por CC0) sin tocar el código, dejando el archivo con el mismo nombre.

## Arte

Las mallas 3D (`public/assets/*.glb`) llevan su textura embebida en WebP; las fuentes 2048² sin
optimizar viven en `assets-src/` (no se publican). El pipeline de optimización es
`scripts/optimize-assets.mjs` (`npm run assets:optimize`).

### Mallas 3D (personaje, obstáculos, props)

`mascot`, `player-rigged`, `prop-balloon`, `prop-pinwheel`,
`obstacle-{carry,oscillate,pendulum,pusher,rotatebar}`: modelos low-poly **generados con Meshy**
(text/image-to-3D). ⚠ **Verificar**: la licencia comercial depende del plan de Meshy con el que se
generaron; confirmar que la cuenta otorga uso comercial de los modelos antes de publicar.

### Texturas standalone

`sky`, `tex-platform`, `tex-ramp`, `tex-wall`, `sign-finish` (`public/assets/*.webp`): texturas del
entorno y la señalética. ⚠ **Verificar/atribuir**: confirmar origen y licencia de cada una (generadas
con IA de pago con licencia comercial, propias, o CC0 con atribución) y completar aquí la fuente
exacta antes de publicar.

### Iconos e identidad

`public/icon-*.png`, `apple-touch-icon.png`: iconos de la PWA (004). ⚠ confirmar origen/licencia si
derivan de un asset de terceros.

> Nota: este archivo es la fuente de la "checklist de licencias" de la puerta de publicación. No
> publicar mientras quede algún ⚠ sin resolver.
