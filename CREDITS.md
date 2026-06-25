# Créditos de audio — Topadero

## Efectos de sonido (SFX)

Generados con **ElevenLabs** (text-to-sound-effects), cuenta de pago (Starter o superior), con
**licencia de uso comercial**. Reproducibles con `scripts/gen-sfx.ts` (lee `ELEVENLABS_API_KEY` de
`.env`; la clave nunca entra en el build). Archivos: `public/audio/sfx_*.{ogg,mp3}`
(jump, land, hit, finish, respawn).

## Música

**PENDIENTE.** Música de fondo de juego **CC0 / royalty-free**. Colocar el track en
`public/audio/music_gameplay.{ogg,mp3}` y registrar aquí su fuente, autor y licencia (CC0 o
equivalente, p. ej. Kenney). El código ya la reproduce en bucle en cuanto el archivo exista.
