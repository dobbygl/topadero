# Créditos de audio — Topadero

## Efectos de sonido (SFX)

`jump`, `land`, `hit`, `respawn`: generados con **ElevenLabs** (text-to-sound-effects), cuenta de
pago (Starter o superior), con **licencia de uso comercial**. Reproducibles con `scripts/gen-sfx.ts`
(lee `ELEVENLABS_API_KEY` de `.env`; la clave nunca entra en el build). Archivos:
`public/audio/sfx_{jump,land,hit,respawn}.{ogg,mp3}`.

`finish` (meta): **Kenney — Music Jingles** (`jingles_STEEL07`), **CC0**
(https://kenney.nl/assets/music-jingles). Archivo: `public/audio/sfx_finish.{ogg,mp3}`. No se
regenera con `gen-sfx.ts`.

## Música

`public/audio/music_gameplay.{ogg,mp3}`: generada con **ElevenLabs Music** (cuenta de pago Starter),
con licencia de uso comercial asumida por el proyecto. Loop instrumental de ~40 s, reproducido con
crossfade en el `AudioManager` para empalmar sin corte (FR-004). Reemplazable por un loop CC0
(p. ej. OpenGameArt filtrado por CC0) sin tocar el código, dejando el archivo con el mismo nombre.
